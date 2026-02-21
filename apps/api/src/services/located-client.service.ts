import { LocatedClientStatus, UserRole, type Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import type { LocatedClientWebhookMessageInput } from '../schemas/located-client.schema.js';
import type { AuthActor } from '../types/auth.types.js';
import type {
  LocatedClientListInput,
  UpdateLocatedClientStatusInput,
} from '../types/located-client.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { normalizePhone } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';
import {
  assertActorCompanyScope,
  getUserReadScopeWhere,
  resolveActorCompanyScope,
} from '../utils/rbac-scope-policy.js';
import { createUuidV7 } from '../utils/uuid.js';

import { resolveSellerScopeByPhone } from './seller-scope-resolver.service.js';

type DateRange = {
  startAt: Date;
  endAt: Date;
};

type LocatedClientActorScope = {
  isRestricted: boolean;
  userIds: string[];
  userPhones: string[];
};

const EMPTY_WHERE: Prisma.LocatedClientWhereInput = {};

export async function listLocatedClients(actor: AuthActor, input: LocatedClientListInput) {
  const pagination = getPagination(input.page, input.page_size);
  const company_id = resolveActorCompanyScope(actor, input.company_id);
  const actorScope = await buildActorScope(actor, company_id);
  const range = parseDateRange(input.start_date, input.end_date);
  const where = buildListWhere({
    actorScope,
    company_id,
    range,
    seller: input.seller,
    status: input.status,
  });

  const [items, total] = await Promise.all([
    prisma.locatedClient.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: [{ identified_at: 'desc' }, { created_at: 'desc' }],
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        identifiedByUser: {
          select: {
            id: true,
            full_name: true,
          },
        },
        visitedByUser: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    }),
    prisma.locatedClient.count({ where }),
  ]);

  return {
    items: items.map(mapLocatedClient),
    meta: {
      page: pagination.page,
      page_size: pagination.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / pagination.page_size)),
    },
  };
}

export async function getLocatedClientById(actor: AuthActor, locatedClientId: string) {
  const locatedClient = await prisma.locatedClient.findFirst({
    where: {
      id: locatedClientId,
      deleted_at: null,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      identifiedByUser: {
        select: {
          id: true,
          full_name: true,
        },
      },
      visitedByUser: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
  });

  if (!locatedClient) {
    throw notFound('Cliente localizado nao encontrado');
  }

  await assertActorCanAccessLocatedClient(actor, locatedClient);
  return mapLocatedClient(locatedClient);
}

export async function updateLocatedClientStatus(
  actor: AuthActor,
  locatedClientId: string,
  input: UpdateLocatedClientStatusInput,
) {
  assertNonAdminMutation(actor);

  const existing = await prisma.locatedClient.findFirst({
    where: {
      id: locatedClientId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw notFound('Cliente localizado nao encontrado');
  }

  await assertActorCanAccessLocatedClient(actor, existing);

  const isVisited = input.status === LocatedClientStatus.VISITADO;
  const updated = await prisma.locatedClient.update({
    where: {
      id: locatedClientId,
    },
    data: {
      status: input.status,
      visited_at: isVisited ? new Date() : null,
      visited_by_user_id: isVisited ? actor.user_id : null,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      identifiedByUser: {
        select: {
          id: true,
          full_name: true,
        },
      },
      visitedByUser: {
        select: {
          id: true,
          full_name: true,
        },
      },
    },
  });

  return mapLocatedClient(updated);
}

export async function deleteLocatedClient(actor: AuthActor, locatedClientId: string) {
  assertNonAdminMutation(actor);

  const existing = await prisma.locatedClient.findFirst({
    where: {
      id: locatedClientId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw notFound('Cliente localizado nao encontrado');
  }

  await assertActorCanAccessLocatedClient(actor, existing);

  await prisma.locatedClient.update({
    where: {
      id: locatedClientId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}

export async function ingestLocatedClientWebhookMessages(messages: LocatedClientWebhookMessageInput[]) {
  let inserted = 0;
  let linked_users = 0;

  for (const message of messages) {
    const normalized = normalizeLocatedClientWebhookMessage(message);
    const resolvedScope = await resolveSellerScopeByPhone({
      user_id: normalized.user_id,
      company_id: normalized.company_id,
      seller_phone: normalized.seller_phone,
    });

    await prisma.locatedClient.create({
      data: {
        id: createUuidV7(),
        company_id: resolvedScope.company_id ?? undefined,
        identified_by_user_id: resolvedScope.user_id ?? undefined,
        source_seller_phone: resolvedScope.seller_phone ?? normalized.seller_phone,
        customer_name: normalized.customer_name,
        city: normalized.city,
        state: normalized.state,
        address: normalized.address,
        map_url: normalized.map_url ?? undefined,
        identified_at: normalized.identified_at ?? new Date(),
      },
    });

    inserted += 1;
    if (resolvedScope.user_id) {
      linked_users += 1;
    }
  }

  return {
    inserted,
    linked_users,
  };
}

async function assertActorCanAccessLocatedClient(
  actor: AuthActor,
  locatedClient: {
    company_id: string | null;
    identified_by_user_id: string | null;
    source_seller_phone: string;
  },
) {
  assertActorCompanyScope(actor, locatedClient.company_id);

  if (actor.role === UserRole.ADMIN || actor.role === UserRole.DIRETOR) {
    return;
  }

  const scope = await buildActorScope(actor, locatedClient.company_id);
  const sourcePhone = normalizePhone(locatedClient.source_seller_phone);
  const hasUserMatch =
    Boolean(locatedClient.identified_by_user_id) &&
    scope.userIds.includes(locatedClient.identified_by_user_id as string);
  const hasPhoneMatch = sourcePhone.length > 0 && scope.userPhones.includes(sourcePhone);

  if (!hasUserMatch && !hasPhoneMatch) {
    throw forbidden('Voce nao tem acesso a este cliente localizado');
  }
}

async function buildActorScope(actor: AuthActor, company_id: string | null): Promise<LocatedClientActorScope> {
  if (actor.role === UserRole.ADMIN || actor.role === UserRole.DIRETOR) {
    return {
      isRestricted: false,
      userIds: [],
      userPhones: [],
    };
  }

  const scopeWhere = getUserReadScopeWhere(actor, 'locatedClients');
  const where: Prisma.UserWhereInput = {
    AND: [
      {
        deleted_at: null,
      },
      ...(company_id
        ? [
            {
              company_id,
            } as Prisma.UserWhereInput,
          ]
        : []),
      ...(Object.keys(scopeWhere).length > 0 ? [scopeWhere] : []),
    ],
  };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      phone: true,
    },
  });

  return {
    isRestricted: true,
    userIds: Array.from(new Set(users.map((user) => user.id))),
    userPhones: Array.from(
      new Set(users.map((user) => normalizePhone(user.phone)).filter((phone) => phone.length > 0)),
    ),
  };
}

function buildListWhere(input: {
  actorScope: LocatedClientActorScope;
  company_id: string | null;
  range: DateRange | null;
  seller?: string;
  status?: LocatedClientStatus;
}): Prisma.LocatedClientWhereInput {
  const andFilters: Prisma.LocatedClientWhereInput[] = [
    {
      deleted_at: null,
    },
  ];

  if (input.company_id) {
    andFilters.push({
      company_id: input.company_id,
    });
  }

  if (input.range) {
    andFilters.push({
      identified_at: {
        gte: input.range.startAt,
        lte: input.range.endAt,
      },
    });
  }

  if (input.status) {
    andFilters.push({
      status: input.status,
    });
  }

  if (input.actorScope.isRestricted) {
    if (input.actorScope.userIds.length === 0 && input.actorScope.userPhones.length === 0) {
      andFilters.push({
        id: '00000000-0000-0000-0000-000000000000',
      });
    } else {
      const orFilters: Prisma.LocatedClientWhereInput[] = [];

      if (input.actorScope.userIds.length > 0) {
        orFilters.push({
          identified_by_user_id: {
            in: input.actorScope.userIds,
          },
        });
      }

      if (input.actorScope.userPhones.length > 0) {
        orFilters.push({
          source_seller_phone: {
            in: input.actorScope.userPhones,
          },
        });
      }

      andFilters.push({
        OR: orFilters,
      });
    }
  }

  const seller = sanitizeText(input.seller);
  if (seller) {
    const seller_phone = normalizePhone(seller);
    const sellerFilters: Prisma.LocatedClientWhereInput[] = [
      {
        identifiedByUser: {
          is: {
            full_name: {
              contains: seller,
              mode: 'insensitive',
            },
          },
        },
      },
    ];

    if (seller_phone.length > 0) {
      sellerFilters.push({
        source_seller_phone: {
          contains: seller_phone,
        },
      });
    }

    andFilters.push({
      OR: sellerFilters,
    });
  }

  if (andFilters.length === 0) {
    return EMPTY_WHERE;
  }

  return {
    AND: andFilters,
  };
}

function parseDateRange(start_date?: string, end_date?: string): DateRange | null {
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

function normalizeLocatedClientWebhookMessage(message: LocatedClientWebhookMessageInput) {
  const sellerPhoneRaw =
    message.seller_phone ??
    message.vendedor_telefone ??
    '';
  const seller_phone = normalizePhone(sellerPhoneRaw);
  if (!seller_phone) {
    throw badRequest('Telefone do vendedor invalido');
  }

  const customer_name = sanitizeText(
    message.customer_name ?? message.cliente_nome,
  );
  const city = sanitizeText(message.city ?? message.cidade);
  const state = sanitizeText(message.state ?? message.estado);
  const address = sanitizeText(message.address ?? message.endereco);

  if (!customer_name || !city || !state || !address) {
    throw badRequest('Dados obrigatorios do cliente localizado nao informados');
  }

  return {
    seller_phone,
    customer_name,
    city,
    state,
    address,
    map_url: sanitizeText(message.map_url),
    identified_at: parseDateTime(
      message.identified_at ??
        message.timestamp_iso ??
        null,
    ),
    company_id: sanitizeText(message.company_id ?? null),
    user_id: sanitizeText(message.user_id ?? null),
  };
}

function parseDateTime(value: string | null) {
  const normalized = sanitizeText(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function sanitizeText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function assertNonAdminMutation(actor: AuthActor) {
  if (actor.role === UserRole.ADMIN) {
    throw forbidden('Admin possui acesso somente leitura em clientes localizados');
  }
}

function mapLocatedClient(locatedClient: {
  id: string;
  company_id: string | null;
  company?: { id: string; name: string } | null;
  identified_by_user_id: string | null;
  identifiedByUser?: { id: string; full_name: string } | null;
  source_seller_phone: string;
  customer_name: string;
  city: string;
  state: string;
  address: string;
  map_url: string | null;
  identified_at: Date;
  status: LocatedClientStatus;
  visited_at: Date | null;
  visited_by_user_id: string | null;
  visitedByUser?: { id: string; full_name: string } | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: locatedClient.id,
    company_id: locatedClient.company_id,
    company_name: locatedClient.company?.name ?? null,
    identified_by_user_id: locatedClient.identified_by_user_id,
    identified_by_user_name: locatedClient.identifiedByUser?.full_name ?? null,
    source_seller_phone: locatedClient.source_seller_phone,
    customer_name: locatedClient.customer_name,
    city: locatedClient.city,
    state: locatedClient.state,
    address: locatedClient.address,
    map_url: locatedClient.map_url,
    identified_at: locatedClient.identified_at,
    status: locatedClient.status,
    visited_at: locatedClient.visited_at,
    visited_by_user_id: locatedClient.visited_by_user_id,
    visited_by_user_name: locatedClient.visitedByUser?.full_name ?? null,
    created_at: locatedClient.created_at,
    updated_at: locatedClient.updated_at,
  };
}


