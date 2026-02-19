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
  const pagination = getPagination(input.page, input.pageSize);
  const companyId = resolveActorCompanyScope(actor, input.companyId);
  const actorScope = await buildActorScope(actor, companyId);
  const range = parseDateRange(input.startDate, input.endDate);
  const where = buildListWhere({
    actorScope,
    companyId,
    range,
    seller: input.seller,
    status: input.status,
  });

  const [items, total] = await Promise.all([
    prisma.locatedClient.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: [{ identifiedAt: 'desc' }, { createdAt: 'desc' }],
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
            fullName: true,
          },
        },
        visitedByUser: {
          select: {
            id: true,
            fullName: true,
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
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  };
}

export async function getLocatedClientById(actor: AuthActor, locatedClientId: string) {
  const locatedClient = await prisma.locatedClient.findFirst({
    where: {
      id: locatedClientId,
      deletedAt: null,
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
          fullName: true,
        },
      },
      visitedByUser: {
        select: {
          id: true,
          fullName: true,
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
      deletedAt: null,
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
      visitedAt: isVisited ? new Date() : null,
      visitedByUserId: isVisited ? actor.userId : null,
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
          fullName: true,
        },
      },
      visitedByUser: {
        select: {
          id: true,
          fullName: true,
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
      deletedAt: null,
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
      deletedAt: new Date(),
    },
  });
}

export async function ingestLocatedClientWebhookMessages(messages: LocatedClientWebhookMessageInput[]) {
  let inserted = 0;
  let linkedUsers = 0;

  for (const message of messages) {
    const normalized = normalizeLocatedClientWebhookMessage(message);
    const resolvedScope = await resolveSellerScopeByPhone({
      userId: normalized.userId,
      companyId: normalized.companyId,
      sellerPhone: normalized.sellerPhone,
    });

    await prisma.locatedClient.create({
      data: {
        companyId: resolvedScope.companyId ?? undefined,
        identifiedByUserId: resolvedScope.userId ?? undefined,
        sourceSellerPhone: resolvedScope.sellerPhone ?? normalized.sellerPhone,
        customerName: normalized.customerName,
        city: normalized.city,
        state: normalized.state,
        address: normalized.address,
        mapUrl: normalized.mapUrl ?? undefined,
        identifiedAt: normalized.identifiedAt ?? new Date(),
      },
    });

    inserted += 1;
    if (resolvedScope.userId) {
      linkedUsers += 1;
    }
  }

  return {
    inserted,
    linkedUsers,
  };
}

async function assertActorCanAccessLocatedClient(
  actor: AuthActor,
  locatedClient: {
    companyId: string | null;
    identifiedByUserId: string | null;
    sourceSellerPhone: string;
  },
) {
  assertActorCompanyScope(actor, locatedClient.companyId);

  if (actor.role === UserRole.ADMIN || actor.role === UserRole.DIRETOR) {
    return;
  }

  const scope = await buildActorScope(actor, locatedClient.companyId);
  const sourcePhone = normalizePhone(locatedClient.sourceSellerPhone);
  const hasUserMatch =
    Boolean(locatedClient.identifiedByUserId) &&
    scope.userIds.includes(locatedClient.identifiedByUserId as string);
  const hasPhoneMatch = sourcePhone.length > 0 && scope.userPhones.includes(sourcePhone);

  if (!hasUserMatch && !hasPhoneMatch) {
    throw forbidden('Voce nao tem acesso a este cliente localizado');
  }
}

async function buildActorScope(actor: AuthActor, companyId: string | null): Promise<LocatedClientActorScope> {
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
        deletedAt: null,
      },
      ...(companyId
        ? [
            {
              companyId,
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
  companyId: string | null;
  range: DateRange | null;
  seller?: string;
  status?: LocatedClientStatus;
}): Prisma.LocatedClientWhereInput {
  const andFilters: Prisma.LocatedClientWhereInput[] = [
    {
      deletedAt: null,
    },
  ];

  if (input.companyId) {
    andFilters.push({
      companyId: input.companyId,
    });
  }

  if (input.range) {
    andFilters.push({
      identifiedAt: {
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
          identifiedByUserId: {
            in: input.actorScope.userIds,
          },
        });
      }

      if (input.actorScope.userPhones.length > 0) {
        orFilters.push({
          sourceSellerPhone: {
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
    const sellerPhone = normalizePhone(seller);
    const sellerFilters: Prisma.LocatedClientWhereInput[] = [
      {
        identifiedByUser: {
          is: {
            fullName: {
              contains: seller,
              mode: 'insensitive',
            },
          },
        },
      },
    ];

    if (sellerPhone.length > 0) {
      sellerFilters.push({
        sourceSellerPhone: {
          contains: sellerPhone,
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

function parseDateRange(startDate?: string, endDate?: string): DateRange | null {
  if (!startDate && !endDate) {
    return null;
  }

  const startAt = startDate
    ? new Date(`${startDate}T00:00:00.000Z`)
    : new Date(`${endDate}T00:00:00.000Z`);
  const endAt = endDate
    ? new Date(`${endDate}T23:59:59.999Z`)
    : new Date(`${startDate}T23:59:59.999Z`);

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
    message.sellerPhone ??
    message.vendedor_telefone ??
    message.vendedorTelefone ??
    '';
  const sellerPhone = normalizePhone(sellerPhoneRaw);
  if (!sellerPhone) {
    throw badRequest('Telefone do vendedor invalido');
  }

  const customerName = sanitizeText(
    message.customer_name ?? message.customerName ?? message.cliente_nome ?? message.clienteNome,
  );
  const city = sanitizeText(message.city ?? message.cidade);
  const state = sanitizeText(message.state ?? message.estado);
  const address = sanitizeText(message.address ?? message.endereco);

  if (!customerName || !city || !state || !address) {
    throw badRequest('Dados obrigatorios do cliente localizado nao informados');
  }

  return {
    sellerPhone,
    customerName,
    city,
    state,
    address,
    mapUrl: sanitizeText(message.map_url ?? message.mapUrl),
    identifiedAt: parseDateTime(
      message.identified_at ??
        message.identifiedAt ??
        message.timestamp_iso ??
        message.timestampIso ??
        null,
    ),
    companyId: sanitizeText(message.company_id ?? message.companyId ?? null),
    userId: sanitizeText(message.user_id ?? message.userId ?? null),
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
  companyId: string | null;
  company?: { id: string; name: string } | null;
  identifiedByUserId: string | null;
  identifiedByUser?: { id: string; fullName: string } | null;
  sourceSellerPhone: string;
  customerName: string;
  city: string;
  state: string;
  address: string;
  mapUrl: string | null;
  identifiedAt: Date;
  status: LocatedClientStatus;
  visitedAt: Date | null;
  visitedByUserId: string | null;
  visitedByUser?: { id: string; fullName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: locatedClient.id,
    companyId: locatedClient.companyId,
    companyName: locatedClient.company?.name ?? null,
    identifiedByUserId: locatedClient.identifiedByUserId,
    identifiedByUserName: locatedClient.identifiedByUser?.fullName ?? null,
    sourceSellerPhone: locatedClient.sourceSellerPhone,
    customerName: locatedClient.customerName,
    city: locatedClient.city,
    state: locatedClient.state,
    address: locatedClient.address,
    mapUrl: locatedClient.mapUrl,
    identifiedAt: locatedClient.identifiedAt,
    status: locatedClient.status,
    visitedAt: locatedClient.visitedAt,
    visitedByUserId: locatedClient.visitedByUserId,
    visitedByUserName: locatedClient.visitedByUser?.fullName ?? null,
    createdAt: locatedClient.createdAt,
    updatedAt: locatedClient.updatedAt,
  };
}
