import { Prisma, UserRole, type Prisma as PrismaType } from '@prisma/client';

import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type {
  DashboardFilterOption,
  DashboardFilterOptionsInput,
  DashboardInteractionsSeriesInput,
  DashboardOverviewInput,
  DashboardPeriod,
  DashboardProductRankingItem,
  DashboardRankingItem,
  DashboardScope,
  DashboardViewBy,
} from '../types/dashboard.types.js';
import { badRequest, forbidden } from '../utils/app-error.js';
import { normalizePhone } from '../utils/normalizers.js';

import { createStorageSignedReadUrlByPublicUrl } from './storage.service.js';

type DashboardRange = {
  period: DashboardPeriod;
  startAt: Date;
  endAt: Date;
  granularity: 'hour' | 'day' | 'month';
};

type CountRow = {
  total: number | bigint;
};

type VendorRankingRow = {
  user_name: string;
  user_phone: string | null;
  interactions: number | bigint;
};

type ProductRankingRow = {
  product_id: string;
  product_name: string;
  citations: number | bigint;
};

type SeriesRow = {
  bucket_start: Date;
  interactions: number | bigint;
};

type DashboardAdoptionMetrics = {
  activeEntities: number;
  activeWithInteractions: number;
  ratePercent: number;
};

type DashboardActorScopeContext = {
  isRestricted: boolean;
  vendorIds: string[];
  vendorPhones: string[];
  supervisorIds: string[];
  supervisorPhones: string[];
  supervisorNames: string[];
  supervisorNameKeys: string[];
};

const EMPTY_HISTORY_SCOPE_WHERE: PrismaType.historico_conversasWhereInput = {};

const PERIOD_OPTIONS: DashboardFilterOption<DashboardPeriod>[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '365d', label: 'Últimos 365 dias' },
];

const VIEW_BY_OPTIONS: DashboardFilterOption<DashboardViewBy>[] = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'supervisor', label: 'Supervisor' },
];

const MANAGER_SCOPE_OPTIONS: DashboardFilterOption<DashboardScope>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'supervisors', label: 'Supervisores' },
  { value: 'vendors', label: 'Vendedores' },
];

const ADMIN_SCOPE_OPTIONS: DashboardFilterOption<DashboardScope>[] = [
  { value: 'all', label: 'Todos' },
];

const SUPERVISOR_SCOPE_OPTIONS: DashboardFilterOption<DashboardScope>[] = [
  { value: 'vendors', label: 'Vendedores' },
];

export async function getDashboardOverview(actor: AuthActor, input: DashboardOverviewInput) {
  const company_id = resolveScopedCompanyId(actor, input.company_id);
  const scope = resolveDashboardScope(actor, input.scope, input.view_by);
  const range = buildRange({
    period: input.period ?? '365d',
    start_date: input.start_date,
    end_date: input.end_date,
  });
  const rank_limit = input.rank_limit ?? 3;
  const actorScopeContext = await buildActorScopeContext(actor, company_id);
  const actorScopePrismaWhere = buildHistoryActorScopePrismaWhere(actorScopeContext, scope);
  const actorScopeSqlWhere = buildHistoryActorScopeSqlWhere(actorScopeContext, scope, 'h');
  const historyWhere = buildHistoryWhere(
    company_id,
    range.startAt,
    range.endAt,
    actorScopePrismaWhere,
  );

  const [
    company,
    totalInteractions,
    vendorAdoption,
    supervisorAdoption,
    vendorHighest,
    vendorLowest,
    supervisorHighest,
    supervisorLowest,
    newClients,
    topProducts,
    bottomProducts,
  ] = await Promise.all([
    company_id
      ? prisma.company.findFirst({
          where: {
            id: company_id,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve(null),
    prisma.historico_conversas.count({
      where: historyWhere,
    }),
    computeVendorAdoption(actor, company_id, historyWhere),
    scope === 'all' || scope === 'supervisors'
      ? computeSupervisorAdoption(actor, company_id, range.startAt, range.endAt, actorScopeSqlWhere)
      : Promise.resolve(null),
    getVendorRanking(
      company_id,
      range.startAt,
      range.endAt,
      rank_limit,
      'desc',
      actorScopeSqlWhere,
    ),
    getVendorRanking(
      company_id,
      range.startAt,
      range.endAt,
      rank_limit,
      'asc',
      actorScopeSqlWhere,
    ),
    scope === 'all' || scope === 'supervisors'
      ? getSupervisorRanking(
          company_id,
          range.startAt,
          range.endAt,
          rank_limit,
          'desc',
          actorScopeSqlWhere,
        )
      : Promise.resolve([]),
    scope === 'all' || scope === 'supervisors'
      ? getSupervisorRanking(
          company_id,
          range.startAt,
          range.endAt,
          rank_limit,
          'asc',
          actorScopeSqlWhere,
        )
      : Promise.resolve([]),
    countDistinctClients(company_id, range.startAt, range.endAt, actorScopeSqlWhere),
    getProductRanking(
      company_id,
      range.startAt,
      range.endAt,
      rank_limit,
      'desc',
      actorScopeSqlWhere,
    ),
    getProductRanking(
      company_id,
      range.startAt,
      range.endAt,
      rank_limit,
      'asc',
      actorScopeSqlWhere,
    ),
  ]);

  const selectedRanking =
    scope === 'supervisors'
      ? { highest: supervisorHighest, lowest: supervisorLowest }
      : { highest: vendorHighest, lowest: vendorLowest };

  const selectedAdoption =
    scope === 'supervisors' && supervisorAdoption ? supervisorAdoption : vendorAdoption;

  return {
    period: range.period,
    scope,
    view_by: resolveLegacyViewByFromScope(scope),
    start_at: range.startAt,
    end_at: range.endAt,
    company: company ? { id: company.id, name: company.name } : null,
    total_interactions: totalInteractions,
    adoption_rate: {
      entity_type: scope === 'supervisors' ? 'supervisor' : 'vendedor',
      active_entities: selectedAdoption.activeEntities,
      active_vendors: selectedAdoption.activeEntities,
      active_with_interactions: selectedAdoption.activeWithInteractions,
      rate_percent: selectedAdoption.ratePercent,
    },
    adoption_rate_by_scope: {
      vendors: {
        active_entities: vendorAdoption.activeEntities,
        active_with_interactions: vendorAdoption.activeWithInteractions,
        rate_percent: vendorAdoption.ratePercent,
      },
      supervisors: supervisorAdoption
        ? {
            active_entities: supervisorAdoption.activeEntities,
            active_with_interactions: supervisorAdoption.activeWithInteractions,
            rate_percent: supervisorAdoption.ratePercent,
          }
        : null,
    },
    vendor_ranking: {
      highest_volume: selectedRanking.highest,
      lowest_volume: selectedRanking.lowest,
    },
    user_ranking: {
      highest_volume: selectedRanking.highest,
      lowest_volume: selectedRanking.lowest,
    },
    rankings_by_scope: {
      vendors: {
        highest_volume: vendorHighest,
        lowest_volume: vendorLowest,
      },
      supervisors:
        scope === 'all' || scope === 'supervisors'
          ? {
              highest_volume: supervisorHighest,
              lowest_volume: supervisorLowest,
            }
          : null,
    },
    new_located_clients: newClients,
    product_ranking: {
      most_cited: topProducts,
      least_cited: bottomProducts,
    },
  };
}

export async function getDashboardInteractionsSeries(
  actor: AuthActor,
  input: DashboardInteractionsSeriesInput,
) {
  const company_id = resolveScopedCompanyId(actor, input.company_id);
  const scope = resolveDashboardScope(actor, input.scope, input.view_by);
  const range = buildRange({
    period: input.period ?? '365d',
    start_date: input.start_date,
    end_date: input.end_date,
  });
  const actorScopeContext = await buildActorScopeContext(actor, company_id);
  const actorScopeSqlWhere = buildHistoryActorScopeSqlWhere(actorScopeContext, scope, 'h');
  const whereSql = buildHistorySqlWhere(company_id, range.startAt, range.endAt, 'h', actorScopeSqlWhere);

  const rows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
    SELECT
      date_trunc(${range.granularity}, COALESCE(h.timestamp_iso, h.created_at)) AS bucket_start,
      COUNT(*)::int AS interactions
    FROM "historico_conversas" h
    WHERE ${whereSql}
    GROUP BY bucket_start
    ORDER BY bucket_start ASC
  `);

  const interactionsByBucket = new Map<string, number>();
  for (const row of rows) {
    const bucketDate = new Date(row.bucket_start);
    interactionsByBucket.set(
      formatBucketKey(bucketDate, range.granularity),
      toSafeNumber(row.interactions),
    );
  }

  const points = generateBuckets(range).map((bucketDate) => {
    const key = formatBucketKey(bucketDate, range.granularity);
    return {
      bucket_start: bucketDate,
      label: formatBucketLabel(bucketDate, range.granularity),
      interactions: interactionsByBucket.get(key) ?? 0,
    };
  });

  const totalInteractions = points.reduce((sum, point) => sum + point.interactions, 0);

  return {
    period: range.period,
    scope,
    view_by: resolveLegacyViewByFromScope(scope),
    granularity: range.granularity,
    start_at: range.startAt,
    end_at: range.endAt,
    company_id,
    total_interactions: totalInteractions,
    points,
  };
}

export async function getDashboardFilterOptions(actor: AuthActor, input: DashboardFilterOptionsInput) {
  const scopedCompanyId = resolveScopedCompanyId(actor, input.company_id);
  const defaultScope = resolveDashboardScope(actor, undefined, undefined);
  const scopeOptions = resolveScopeOptionsByRole(actor.role);
  const includeSignedCompanyLogo = actor.role !== UserRole.ADMIN;

  const companyOptions =
    actor.role === UserRole.ADMIN
      ? await prisma.company.findMany({
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
          orderBy: {
            name: 'asc',
          },
        })
      : scopedCompanyId
        ? await prisma.company.findMany({
            where: {
              id: scopedCompanyId,
              deleted_at: null,
            },
            select: {
              id: true,
              name: true,
              logo_url: true,
            },
          })
        : [];

  const actorScopeContext = await buildActorScopeContext(actor, scopedCompanyId);
  const mappedCompanyOptions = await Promise.all(
    companyOptions.map((company) =>
      mapDashboardCompanyOption(company, {
        includeSignedLogo: includeSignedCompanyLogo,
      }),
    ),
  );

  return {
    role: actor.role,
    period_options: PERIOD_OPTIONS,
    scope_options: scopeOptions,
    view_by_options:
      actor.role === UserRole.GERENTE_COMERCIAL || actor.role === UserRole.DIRETOR
        ? VIEW_BY_OPTIONS
        : VIEW_BY_OPTIONS.filter((option) => option.value === 'vendedor'),
    company_options: mappedCompanyOptions,
    defaults: {
      period: '365d' as DashboardPeriod,
      scope: defaultScope,
      view_by: resolveLegacyViewByFromScope(defaultScope) as DashboardViewBy,
      company_id: scopedCompanyId,
    },
    team_summary: {
      supervisors: actorScopeContext.supervisorNames.length,
      vendors: actorScopeContext.vendorIds.length,
    },
  };
}

async function mapDashboardCompanyOption(
  company: {
    id: string;
    name: string;
    logo_url: string | null;
  },
  options: {
    includeSignedLogo: boolean;
  },
) {
  let logo_signed_url: string | null = null;

  if (options.includeSignedLogo && company.logo_url) {
    try {
      const signedReadUrl = await createStorageSignedReadUrlByPublicUrl(company.logo_url);
      logo_signed_url = signedReadUrl?.readUrl ?? null;
    } catch (error) {
      logger.warn(
        { err: error, company_id: company.id, logo_url: company.logo_url },
        'failed to create signed read url for dashboard company option logo',
      );
    }
  }

  return {
    value: company.id,
    label: company.name,
    logo_signed_url,
  };
}

function resolveScopedCompanyId(actor: AuthActor, requestedCompanyId?: string) {
  if (actor.role === UserRole.ADMIN) {
    return requestedCompanyId ?? null;
  }

  if (!actor.company_id) {
    throw forbidden('Usuário não vinculado à empresa');
  }

  return actor.company_id;
}

function resolveDashboardScope(
  actor: AuthActor,
  requestedScope?: DashboardScope,
  legacyViewBy?: DashboardViewBy,
): DashboardScope {
  const scopeFromLegacy = legacyViewBy ? mapLegacyViewByToScope(legacyViewBy) : undefined;
  const defaultScope =
    actor.role === UserRole.GERENTE_COMERCIAL
      ? 'all'
      : actor.role === UserRole.SUPERVISOR
        ? 'vendors'
        : 'all';

  const resolvedScope = requestedScope ?? scopeFromLegacy ?? defaultScope;

  if (actor.role === UserRole.ADMIN && resolvedScope !== 'all') {
    throw badRequest('Perfil admin utiliza somente escopo total da empresa selecionada');
  }

  if (actor.role === UserRole.SUPERVISOR && resolvedScope !== 'vendors') {
    throw badRequest('Perfil supervisor pode visualizar somente vendedores vinculados');
  }

  return resolvedScope;
}

function resolveScopeOptionsByRole(role: UserRole): DashboardFilterOption<DashboardScope>[] {
  if (role === UserRole.GERENTE_COMERCIAL || role === UserRole.DIRETOR) {
    return MANAGER_SCOPE_OPTIONS;
  }

  if (role === UserRole.SUPERVISOR) {
    return SUPERVISOR_SCOPE_OPTIONS;
  }

  return ADMIN_SCOPE_OPTIONS;
}

function mapLegacyViewByToScope(view_by: DashboardViewBy): DashboardScope {
  return view_by === 'supervisor' ? 'supervisors' : 'vendors';
}

function resolveLegacyViewByFromScope(scope: DashboardScope): DashboardViewBy {
  return scope === 'supervisors' ? 'supervisor' : 'vendedor';
}

async function buildActorScopeContext(
  actor: AuthActor,
  company_id: string | null,
): Promise<DashboardActorScopeContext> {
  if (actor.role === UserRole.ADMIN) {
    return {
      isRestricted: false,
      vendorIds: [],
      vendorPhones: [],
      supervisorIds: [],
      supervisorPhones: [],
      supervisorNames: [],
      supervisorNameKeys: [],
    };
  }

  if (!company_id) {
    return {
      isRestricted: true,
      vendorIds: [],
      vendorPhones: [],
      supervisorIds: [],
      supervisorPhones: [],
      supervisorNames: [],
      supervisorNameKeys: [],
    };
  }

  if (actor.role === UserRole.DIRETOR) {
    return {
      isRestricted: false,
      vendorIds: [],
      vendorPhones: [],
      supervisorIds: [],
      supervisorPhones: [],
      supervisorNames: [],
      supervisorNameKeys: [],
    };
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    const [supervisors, vendors] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: UserRole.SUPERVISOR,
          manager_id: actor.user_id,
          company_id,
          deleted_at: null,
        },
        select: {
          id: true,
          full_name: true,
          phone: true,
        },
      }),
      prisma.user.findMany({
        where: {
          role: UserRole.VENDEDOR,
          company_id,
          deleted_at: null,
          supervisor: {
            is: {
              manager_id: actor.user_id,
              deleted_at: null,
            },
          },
        },
        select: {
          id: true,
          phone: true,
        },
      }),
    ]);

    const supervisorNames = Array.from(
      new Set(
        supervisors
          .map((supervisor) => sanitizeText(supervisor.full_name))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const supervisorNameKeys = Array.from(
      new Set(
        supervisorNames.map((name) => normalizeNameKey(name)).filter((value) => value.length > 0),
      ),
    );

    return {
      isRestricted: true,
      vendorIds: Array.from(new Set(vendors.map((vendor) => vendor.id))),
      vendorPhones: Array.from(
        new Set(
          vendors
            .map((vendor) => normalizePhone(vendor.phone))
            .filter((phone) => phone.length > 0),
        ),
      ),
      supervisorIds: Array.from(new Set(supervisors.map((supervisor) => supervisor.id))),
      supervisorPhones: Array.from(
        new Set(
          supervisors
            .map((supervisor) => normalizePhone(supervisor.phone))
            .filter((phone) => phone.length > 0),
        ),
      ),
      supervisorNames,
      supervisorNameKeys,
    };
  }

  const vendors = await prisma.user.findMany({
    where: {
      role: UserRole.VENDEDOR,
      company_id,
      supervisor_id: actor.user_id,
      deleted_at: null,
    },
    select: {
      id: true,
      phone: true,
    },
  });

  return {
    isRestricted: true,
    vendorIds: Array.from(new Set(vendors.map((vendor) => vendor.id))),
    vendorPhones: Array.from(
      new Set(
        vendors.map((vendor) => normalizePhone(vendor.phone)).filter((phone) => phone.length > 0),
      ),
    ),
    supervisorIds: [],
    supervisorPhones: [],
    supervisorNames: [],
    supervisorNameKeys: [],
  };
}

function buildHistoryActorScopePrismaWhere(
  scopeContext: DashboardActorScopeContext,
  scope: DashboardScope,
): PrismaType.historico_conversasWhereInput {
  if (!scopeContext.isRestricted) {
    return EMPTY_HISTORY_SCOPE_WHERE;
  }

  const includeVendorFilters = scope === 'all' || scope === 'vendors';
  const includeSupervisorInteractionFilters = scope === 'all' || scope === 'supervisors';
  const orFilters: PrismaType.historico_conversasWhereInput[] = [];

  if (includeVendorFilters && scopeContext.vendorIds.length > 0) {
    orFilters.push({
      user_id: {
        in: scopeContext.vendorIds,
      },
    });
  }

  if (includeVendorFilters && scopeContext.vendorPhones.length > 0) {
    orFilters.push({
      vendedor_telefone: {
        in: scopeContext.vendorPhones,
      },
    });
  }

  if (includeSupervisorInteractionFilters && scopeContext.supervisorIds.length > 0) {
    orFilters.push({
      user_id: {
        in: scopeContext.supervisorIds,
      },
    });
  }

  if (includeSupervisorInteractionFilters && scopeContext.supervisorPhones.length > 0) {
    orFilters.push({
      vendedor_telefone: {
        in: scopeContext.supervisorPhones,
      },
    });
  }

  if (scope === 'all' && scopeContext.supervisorNames.length > 0) {
    for (const supervisorName of scopeContext.supervisorNames) {
      orFilters.push({
        supervisor: {
          equals: supervisorName,
          mode: 'insensitive',
        },
      });
    }
  }

  if (orFilters.length === 0) {
    return {
      id: '00000000-0000-0000-0000-000000000000',
    };
  }

  return {
    OR: orFilters,
  };
}

function buildHistoryActorScopeSqlWhere(
  scopeContext: DashboardActorScopeContext,
  scope: DashboardScope,
  tableAlias: string,
) {
  if (!scopeContext.isRestricted) {
    return Prisma.sql`TRUE`;
  }

  const alias = Prisma.raw(tableAlias);
  const includeVendorFilters = scope === 'all' || scope === 'vendors';
  const includeSupervisorInteractionFilters = scope === 'all' || scope === 'supervisors';
  const conditions: Prisma.Sql[] = [];

  if (includeVendorFilters && scopeContext.vendorIds.length > 0) {
    conditions.push(Prisma.sql`${alias}.user_id IN (${Prisma.join(scopeContext.vendorIds)})`);
  }

  if (includeVendorFilters && scopeContext.vendorPhones.length > 0) {
    conditions.push(
      Prisma.sql`${alias}.vendedor_telefone IN (${Prisma.join(scopeContext.vendorPhones)})`,
    );
  }

  if (includeSupervisorInteractionFilters && scopeContext.supervisorIds.length > 0) {
    conditions.push(Prisma.sql`${alias}.user_id IN (${Prisma.join(scopeContext.supervisorIds)})`);
  }

  if (includeSupervisorInteractionFilters && scopeContext.supervisorPhones.length > 0) {
    conditions.push(
      Prisma.sql`${alias}.vendedor_telefone IN (${Prisma.join(scopeContext.supervisorPhones)})`,
    );
  }

  if (scope === 'all' && scopeContext.supervisorNameKeys.length > 0) {
    conditions.push(
      Prisma.sql`LOWER(TRIM(COALESCE(${alias}.supervisor, ''))) IN (${Prisma.join(scopeContext.supervisorNameKeys)})`,
    );
  }

  if (conditions.length === 0) {
    return Prisma.sql`FALSE`;
  }

  return Prisma.sql`(${Prisma.join(conditions, ' OR ')})`;
}

function buildRange(input: {
  period: DashboardPeriod;
  start_date?: string;
  end_date?: string;
}): DashboardRange {
  const customRange = parseCustomDateRange(input.start_date, input.end_date);
  if (customRange) {
    return {
      period: input.period,
      startAt: customRange.startAt,
      endAt: customRange.endAt,
      granularity: resolveRangeGranularity(customRange.startAt, customRange.endAt),
    };
  }

  const period = input.period;
  const now = new Date();
  const endAt = new Date(now);

  if (period === 'today') {
    const startAt = new Date(now);
    startAt.setHours(0, 0, 0, 0);

    return {
      period,
      startAt,
      endAt,
      granularity: 'hour',
    };
  }

  if (period === '7d') {
    const startAt = new Date(now);
    startAt.setDate(startAt.getDate() - 6);
    startAt.setHours(0, 0, 0, 0);

    return {
      period,
      startAt,
      endAt,
      granularity: 'day',
    };
  }

  if (period === '30d') {
    const startAt = new Date(now);
    startAt.setDate(startAt.getDate() - 29);
    startAt.setHours(0, 0, 0, 0);

    return {
      period,
      startAt,
      endAt,
      granularity: 'day',
    };
  }

  const startAt = new Date(now);
  startAt.setDate(startAt.getDate() - 364);
  startAt.setHours(0, 0, 0, 0);

  return {
    period,
    startAt,
    endAt,
    granularity: 'month',
  };
}

function parseCustomDateRange(start_date?: string, end_date?: string) {
  if (!start_date && !end_date) {
    return null;
  }

  const startAt = start_date
    ? new Date(`${start_date}T00:00:00.000Z`)
    : new Date(`${end_date}T00:00:00.000Z`);
  const endAt = end_date
    ? new Date(`${end_date}T23:59:59.999Z`)
    : new Date(`${start_date}T23:59:59.999Z`);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw badRequest('Periodo de data invalido');
  }

  if (startAt > endAt) {
    throw badRequest('A data inicial nao pode ser maior que a data final');
  }

  return {
    startAt,
    endAt,
  };
}

function resolveRangeGranularity(startAt: Date, endAt: Date): 'hour' | 'day' | 'month' {
  const totalDays = Math.floor((endAt.getTime() - startAt.getTime()) / 86_400_000) + 1;

  if (totalDays <= 1) {
    return 'hour';
  }

  if (totalDays <= 90) {
    return 'day';
  }

  return 'month';
}

function buildHistoryWhere(
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  actorScopeWhere: PrismaType.historico_conversasWhereInput = EMPTY_HISTORY_SCOPE_WHERE,
): PrismaType.historico_conversasWhereInput {
  const filters: PrismaType.historico_conversasWhereInput[] = [
    {
      OR: [
        {
          timestamp_iso: {
            gte: startAt,
            lte: endAt,
          },
        },
        {
          AND: [
            {
              timestamp_iso: null,
            },
            {
              created_at: {
                gte: startAt,
                lte: endAt,
              },
            },
          ],
        },
      ],
    },
  ];

  if (company_id) {
    filters.push({
      company_id: company_id,
    });
  }

  if (Object.keys(actorScopeWhere).length > 0) {
    filters.push(actorScopeWhere);
  }

  return {
    AND: filters,
  };
}

async function computeVendorAdoption(
  actor: AuthActor,
  company_id: string | null,
  historyWhere: PrismaType.historico_conversasWhereInput,
): Promise<DashboardAdoptionMetrics> {
  const activeVendorWhere: PrismaType.UserWhereInput = {
    role: UserRole.VENDEDOR,
    is_active: true,
    deleted_at: null,
    ...(company_id ? { company_id } : {}),
  };

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    activeVendorWhere.supervisor = {
      is: {
        manager_id: actor.user_id,
        deleted_at: null,
      },
    };
  }

  if (actor.role === UserRole.SUPERVISOR) {
    activeVendorWhere.supervisor_id = actor.user_id;
  }

  const activeVendors = await prisma.user.findMany({
    where: activeVendorWhere,
    select: {
      id: true,
      phone: true,
    },
  });

  if (activeVendors.length === 0) {
    return {
      activeEntities: 0,
      activeWithInteractions: 0,
      ratePercent: 0,
    };
  }

  const vendorIds = activeVendors.map((vendor) => vendor.id);
  const vendorPhones = activeVendors
    .map((vendor) => normalizePhone(vendor.phone))
    .filter((phone) => phone.length > 0);

  if (vendorIds.length === 0 && vendorPhones.length === 0) {
    return {
      activeEntities: activeVendors.length,
      activeWithInteractions: 0,
      ratePercent: 0,
    };
  }

  const matches = await prisma.historico_conversas.findMany({
    where: {
      AND: [
        historyWhere,
        {
          OR: [
            ...(vendorIds.length > 0
              ? [
                  {
                    user_id: {
                      in: vendorIds,
                    },
                  } as PrismaType.historico_conversasWhereInput,
                ]
              : []),
            ...(vendorPhones.length > 0
              ? [
                  {
                    vendedor_telefone: {
                      in: vendorPhones,
                    },
                  } as PrismaType.historico_conversasWhereInput,
                ]
              : []),
          ],
        },
      ],
    },
    select: {
      user_id: true,
      vendedor_telefone: true,
    },
    distinct: ['user_id', 'vendedor_telefone'],
  });

  const matchedVendorIds = new Set<string>();
  const vendorById = new Map(activeVendors.map((vendor) => [vendor.id, vendor.id]));
  const vendorByPhone = new Map<string, string>();

  for (const vendor of activeVendors) {
    const normalizedPhone = normalizePhone(vendor.phone);
    if (normalizedPhone.length > 0) {
      vendorByPhone.set(normalizedPhone, vendor.id);
    }
  }

  for (const match of matches) {
    if (match.user_id && vendorById.has(match.user_id)) {
      matchedVendorIds.add(match.user_id);
      continue;
    }

    const normalizedPhone = normalizePhone(match.vendedor_telefone ?? '');
    if (normalizedPhone.length > 0) {
      const vendorId = vendorByPhone.get(normalizedPhone);
      if (vendorId) {
        matchedVendorIds.add(vendorId);
      }
    }
  }

  const activeWithInteractions = matchedVendorIds.size;
  const ratePercent =
    activeVendors.length > 0
      ? Math.round((activeWithInteractions / activeVendors.length) * 100)
      : 0;

  return {
    activeEntities: activeVendors.length,
    activeWithInteractions,
    ratePercent,
  };
}

async function computeSupervisorAdoption(
  actor: AuthActor,
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  actorScopeSqlWhere: Prisma.Sql,
): Promise<DashboardAdoptionMetrics> {
  if (actor.role === UserRole.SUPERVISOR) {
    return {
      activeEntities: 0,
      activeWithInteractions: 0,
      ratePercent: 0,
    };
  }

  const activeSupervisorWhere: PrismaType.UserWhereInput = {
    role: UserRole.SUPERVISOR,
    is_active: true,
    deleted_at: null,
    ...(company_id ? { company_id } : {}),
  };

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    activeSupervisorWhere.manager_id = actor.user_id;
  }

  const activeSupervisors = await prisma.user.findMany({
    where: activeSupervisorWhere,
    select: {
      full_name: true,
    },
  });

  if (activeSupervisors.length === 0) {
    return {
      activeEntities: 0,
      activeWithInteractions: 0,
      ratePercent: 0,
    };
  }

  const whereSql = buildHistorySqlWhere(company_id, startAt, endAt, 'h', actorScopeSqlWhere);
  const rows = await prisma.$queryRaw<{ supervisor_name: string }[]>(Prisma.sql`
    SELECT DISTINCT TRIM(h.supervisor) AS supervisor_name
    FROM "historico_conversas" h
    WHERE ${whereSql}
      AND h.supervisor IS NOT NULL
      AND TRIM(h.supervisor) <> ''
  `);

  const activeSupervisorNameKeys = new Set(
    activeSupervisors.map((supervisor) => normalizeNameKey(supervisor.full_name)),
  );
  const supervisorNameKeysWithInteractions = new Set(
    rows.map((row) => normalizeNameKey(row.supervisor_name)).filter((value) => value.length > 0),
  );

  let activeWithInteractions = 0;
  for (const supervisorNameKey of supervisorNameKeysWithInteractions) {
    if (activeSupervisorNameKeys.has(supervisorNameKey)) {
      activeWithInteractions += 1;
    }
  }

  const ratePercent =
    activeSupervisors.length > 0
      ? Math.round((activeWithInteractions / activeSupervisors.length) * 100)
      : 0;

  return {
    activeEntities: activeSupervisors.length,
    activeWithInteractions,
    ratePercent,
  };
}

async function getSupervisorRanking(
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  limit: number,
  direction: 'asc' | 'desc',
  actorScopeSqlWhere: Prisma.Sql,
): Promise<DashboardRankingItem[]> {
  const whereSql = buildHistorySqlWhere(company_id, startAt, endAt, 'h', actorScopeSqlWhere);
  const orderSql = direction === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  const rows = await prisma.$queryRaw<VendorRankingRow[]>(Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM(h.supervisor), ''), 'Supervisor sem nome') AS user_name,
      NULL::text AS user_phone,
      COUNT(*)::int AS interactions
    FROM "historico_conversas" h
    WHERE ${whereSql}
    GROUP BY user_name
    ORDER BY interactions ${orderSql}, user_name ASC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    user_name: row.user_name,
    user_phone: null,
    interactions: toSafeNumber(row.interactions),
  }));
}

async function getVendorRanking(
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  limit: number,
  direction: 'asc' | 'desc',
  actorScopeSqlWhere: Prisma.Sql,
): Promise<DashboardRankingItem[]> {
  const whereSql = buildHistorySqlWhere(company_id, startAt, endAt, 'h', actorScopeSqlWhere);
  const orderSql = direction === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  const rows = await prisma.$queryRaw<VendorRankingRow[]>(Prisma.sql`
    SELECT
      COALESCE(NULLIF(TRIM(h.vendedor_nome), ''), NULLIF(TRIM(h.vendedor_telefone), ''), 'Vendedor sem nome') AS user_name,
      NULLIF(TRIM(h.vendedor_telefone), '') AS user_phone,
      COUNT(*)::int AS interactions
    FROM "historico_conversas" h
    WHERE ${whereSql}
    GROUP BY user_name, user_phone
    ORDER BY interactions ${orderSql}, user_name ASC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    user_name: row.user_name,
    user_phone: row.user_phone,
    interactions: toSafeNumber(row.interactions),
  }));
}

async function getProductRanking(
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  limit: number,
  direction: 'asc' | 'desc',
  actorScopeSqlWhere: Prisma.Sql,
): Promise<DashboardProductRankingItem[]> {
  const whereSql = buildProductSqlWhere(company_id, startAt, endAt, actorScopeSqlWhere);
  const orderSql = direction === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

  const rows = await prisma.$queryRaw<ProductRankingRow[]>(Prisma.sql`
    SELECT
      p.id AS product_id,
      p.nome AS product_name,
      COUNT(*)::int AS citations
    FROM "historico_conversas_produtos" hcp
    INNER JOIN "produtos" p ON p.id = hcp.produto_id
    INNER JOIN "historico_conversas" h ON h.id = hcp.historico_id
    WHERE ${whereSql}
    GROUP BY p.id, p.nome
    ORDER BY citations ${orderSql}, p.nome ASC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    product_id: row.product_id,
    product_name: row.product_name,
    citations: toSafeNumber(row.citations),
  }));
}

async function countDistinctClients(
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  actorScopeSqlWhere: Prisma.Sql,
) {
  const whereSql = buildHistorySqlWhere(company_id, startAt, endAt, 'h', actorScopeSqlWhere);

  const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS total
    FROM (
      SELECT LOWER(TRIM(h.cliente_nome)) AS client_key
      FROM "historico_conversas" h
      WHERE ${whereSql}
        AND h.cliente_nome IS NOT NULL
        AND TRIM(h.cliente_nome) <> ''
      GROUP BY LOWER(TRIM(h.cliente_nome))
    ) ranked_clients
  `);

  return rows.length > 0 ? toSafeNumber(rows[0].total) : 0;
}

function buildHistorySqlWhere(
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  tableAlias: string,
  actorScopeSqlWhere: Prisma.Sql = Prisma.sql`TRUE`,
) {
  const alias = Prisma.raw(tableAlias);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`COALESCE(${alias}.timestamp_iso, ${alias}.created_at) >= ${startAt}`,
    Prisma.sql`COALESCE(${alias}.timestamp_iso, ${alias}.created_at) <= ${endAt}`,
    actorScopeSqlWhere,
  ];

  if (company_id) {
    conditions.push(Prisma.sql`${alias}.company_id = ${company_id}`);
  }

  return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
}

function buildProductSqlWhere(
  company_id: string | null,
  startAt: Date,
  endAt: Date,
  actorScopeSqlWhere: Prisma.Sql,
) {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`hcp.cited_at >= ${startAt}`,
    Prisma.sql`hcp.cited_at <= ${endAt}`,
    actorScopeSqlWhere,
    Prisma.sql`p.deleted_at IS NULL`,
  ];

  if (company_id) {
    conditions.push(
      Prisma.sql`(hcp.company_id = ${company_id} OR (hcp.company_id IS NULL AND p.company_id = ${company_id}))`,
    );
  }

  return Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
}

function generateBuckets(range: DashboardRange) {
  const buckets: Date[] = [];

  if (range.granularity === 'hour') {
    const cursor = new Date(range.startAt);
    cursor.setMinutes(0, 0, 0);
    const end = new Date(range.endAt);
    end.setMinutes(0, 0, 0);

    while (cursor <= end) {
      buckets.push(new Date(cursor));
      cursor.setHours(cursor.getHours() + 1);
    }

    return buckets;
  }

  if (range.granularity === 'day') {
    const cursor = new Date(range.startAt);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(range.endAt);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      buckets.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return buckets;
  }

  const cursor = new Date(range.startAt);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(range.endAt);
  end.setDate(1);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    buckets.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

function formatBucketKey(date: Date, granularity: 'hour' | 'day' | 'month') {
  if (granularity === 'hour') {
    return date.toISOString().slice(0, 13);
  }

  if (granularity === 'day') {
    return date.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 7);
}

function formatBucketLabel(date: Date, granularity: 'hour' | 'day' | 'month') {
  if (granularity === 'hour') {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  if (granularity === 'day') {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  return date.toLocaleDateString('pt-BR', {
    month: 'short',
  });
}

function toSafeNumber(value: number | bigint) {
  return typeof value === 'bigint' ? Number(value) : value;
}

function normalizeNameKey(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sanitizeText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}


