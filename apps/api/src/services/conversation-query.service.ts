import { UserRole, type Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type {
  ConversationDetailInput,
  ConversationListInput,
  ConversationTimelineMessage,
} from '../types/conversation.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { normalizePhone } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';
import { createUuidV7 } from '../utils/uuid.js';

type DateRange = {
  startAt: Date;
  endAt: Date;
};

type InteractionRowForDate = {
  timestamp_iso: Date | null;
  data: Date | null;
  created_at: Date | null;
};

type ConversationGroupingRow = {
  company_id: string | null;
  user_id: string | null;
  vendedor_telefone: string | null;
  vendedor_nome: string | null;
  _count: {
    _all: number;
  };
  _max: InteractionRowForDate;
  _min: InteractionRowForDate;
};

type ConversationSelector =
  | {
      by: 'user';
      company_id: string | null;
      user_id: string;
    }
  | {
      by: 'phone';
      company_id: string | null;
      phone: string;
    }
  | {
      by: 'name';
      company_id: string | null;
      name_key: string;
      names: Set<string>;
    }
  | {
      by: 'raw';
      company_id: string | null;
      user_id: string | null;
      vendedor_telefone: string | null;
      vendedor_nome: string | null;
      unique_key: string;
    };

type MergedConversationAccumulator = {
  merge_key: string;
  selector: ConversationSelector;
  company_id: string | null;
  seller_user_id: string | null;
  vendedor_nome: string | null;
  vendedor_telefone: string | null;
  total_interacoes: number;
  ultima_interacao_em: Date | null;
  primeira_interacao_em: Date | null;
};

type ConversationListItemSnapshot = {
  id: string;
  company_id: string | null;
  vendedor_nome: string | null;
  vendedor_telefone: string | null;
  seller_user_id: string | null;
  total_interacoes: number;
  ultima_interacao_em: Date | null;
  primeira_interacao_em: Date | null;
};

type SellerIdentityScope = {
  userIds: string[];
  phones: string[];
};

const EMPTY_WHERE: Prisma.historico_conversasWhereInput = {};

export async function listConversations(actor: AuthActor, input: ConversationListInput) {
  const pagination = getPagination(input.page, input.page_size);
  const scopedCompanyId = resolveScopedCompanyId(actor, input.company_id);
  const range = parseDateRange(input.start_date, input.end_date);
  const [sellerNameScope, querySellerScope] = await Promise.all([
    resolveSellerIdentityScopeByName(scopedCompanyId, input.vendedor_nome),
    resolveSellerIdentityScopeByName(scopedCompanyId, input.q),
  ]);
  const baseWhere = buildConversationListWhere({
    company_id: scopedCompanyId,
    range,
    q: input.q,
    vendedor_nome: input.vendedor_nome,
    vendedor_telefone: input.vendedor_telefone,
    seller_name_scope: sellerNameScope,
    query_seller_scope: querySellerScope,
  });
  const actorScopeWhere = await buildConversationActorScopeWhere(actor, scopedCompanyId);
  const where = combineWhere(baseWhere, actorScopeWhere);

  const groupedRaw = await prisma.historico_conversas.groupBy({
    by: ['company_id', 'user_id', 'vendedor_telefone', 'vendedor_nome'],
    where,
    _count: {
      _all: true,
    },
    _max: {
      timestamp_iso: true,
      data: true,
      created_at: true,
    },
    _min: {
      timestamp_iso: true,
      data: true,
      created_at: true,
    },
  });
  const grouped = groupedRaw as ConversationGroupingRow[];

  const mergedGroups = mergeConversationGroups(grouped);
  const total = mergedGroups.length;
  const pagedGroups = mergedGroups.slice(pagination.skip, pagination.skip + pagination.take);

  const itemsWithoutCompanyName = await Promise.all(
    pagedGroups.map(async (group): Promise<ConversationListItemSnapshot | null> => {
      const scopedGroupWhere = combineWhere(where, buildConversationSelectorWhere(group.selector));

      const latestRow = await prisma.historico_conversas.findFirst({
        where: withActiveConversationRows(scopedGroupWhere),
        select: {
          id: true,
          user_id: true,
          timestamp_iso: true,
          data: true,
          created_at: true,
          vendedor_nome: true,
          vendedor_telefone: true,
        },
        orderBy: [{ timestamp_iso: 'desc' }, { created_at: 'desc' }],
      });

      if (!latestRow) {
        return null;
      }

      return {
        id: latestRow.id,
        company_id: group.company_id ?? null,
        vendedor_nome:
          sanitizeDisplayText(latestRow.vendedor_nome) ?? sanitizeDisplayText(group.vendedor_nome),
        vendedor_telefone: sanitizeDisplayText(latestRow.vendedor_telefone) ?? group.vendedor_telefone,
        seller_user_id: latestRow.user_id ?? group.seller_user_id,
        total_interacoes: group.total_interacoes,
        ultima_interacao_em:
          resolveInteractionDate({
            timestamp_iso: latestRow.timestamp_iso,
            data: latestRow.data,
            created_at: latestRow.created_at,
          }) ?? group.ultima_interacao_em,
        primeira_interacao_em: group.primeira_interacao_em,
      };
    }),
  );

  const items = itemsWithoutCompanyName.filter(
    (item): item is ConversationListItemSnapshot => Boolean(item),
  );

  const sellerUserIds = Array.from(
    new Set(items.map((item) => item.seller_user_id).filter((user_id): user_id is string => Boolean(user_id))),
  );

  const sellerUsersById =
    sellerUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: sellerUserIds,
            },
          },
          select: {
            id: true,
            full_name: true,
          },
        })
      : [];

  const sellerNameByUserId = new Map(
    sellerUsersById.map((user) => [user.id, sanitizeDisplayText(user.full_name)]),
  );

  const companyIds = Array.from(
    new Set(items.map((item) => item.company_id).filter((company_id): company_id is string => Boolean(company_id))),
  );
  const companies =
    companyIds.length > 0
      ? await prisma.company.findMany({
          where: {
            id: {
              in: companyIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];
  const companyNameById = new Map(companies.map((company) => [company.id, company.name]));

  return {
    items: items.map((item) => ({
      id: item.id,
      company_id: item.company_id,
      company_name: item.company_id ? companyNameById.get(item.company_id) ?? null : null,
      vendedor_nome: resolveSellerDisplayName({
        userNameById: item.seller_user_id ? (sellerNameByUserId.get(item.seller_user_id) ?? null) : null,
        sellerPhone: item.vendedor_telefone,
      }),
      vendedor_telefone: item.vendedor_telefone,
      total_interacoes: item.total_interacoes,
      ultima_interacao_em: item.ultima_interacao_em,
      primeira_interacao_em: item.primeira_interacao_em,
    })),
    meta: {
      page: pagination.page,
      page_size: pagination.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / pagination.page_size)),
    },
  };
}

export async function getConversationById(
  actor: AuthActor,
  conversation_id: string,
  input: ConversationDetailInput,
) {
  const baseConversation = await prisma.historico_conversas.findFirst({
    where: {
      id: conversation_id,
      deleted_at: null,
    },
    select: {
      id: true,
      user_id: true,
      company_id: true,
      vendedor_nome: true,
      vendedor_telefone: true,
      cliente_nome: true,
      timestamp_iso: true,
      data: true,
      created_at: true,
    },
  });

  if (!baseConversation) {
    throw notFound('Conversa não encontrada');
  }

  if (actor.role !== UserRole.ADMIN) {
    if (!actor.company_id) {
      throw forbidden('Usuário não vinculado à empresa');
    }

    if (!baseConversation.company_id || baseConversation.company_id !== actor.company_id) {
      throw forbidden('Você não tem acesso a esta conversa');
    }
  }

  const actorScopeWhere = await buildConversationActorScopeWhere(
    actor,
    baseConversation.company_id ?? null,
  );
  if (Object.keys(actorScopeWhere).length > 0) {
    const scopedConversation = await prisma.historico_conversas.findFirst({
      where: combineWhere(
        {
          id: conversation_id,
          deleted_at: null,
        },
        actorScopeWhere,
      ),
      select: {
        id: true,
      },
    });

    if (!scopedConversation) {
      throw forbidden('Voce nao tem acesso a esta conversa');
    }
  }

  const vendedor_telefone = sanitizeDisplayText(baseConversation.vendedor_telefone);
  const sellerById = baseConversation.user_id
    ? await prisma.user.findFirst({
        where: {
          id: baseConversation.user_id,
        },
        select: {
          full_name: true,
        },
      })
    : null;
  const vendedor_nome = resolveSellerDisplayName({
    userNameById: sanitizeDisplayText(sellerById?.full_name),
    sellerPhone: vendedor_telefone,
  });

  if (!vendedor_telefone && vendedor_nome === 'Vendedor sem nome') {
    throw notFound('Não foi possível identificar o vendedor desta conversa');
  }

  const conversationSelector = resolveConversationSelector({
    company_id: baseConversation.company_id,
    user_id: baseConversation.user_id,
    vendedor_telefone: baseConversation.vendedor_telefone,
    vendedor_nome: baseConversation.vendedor_nome,
    unknown_key: baseConversation.id,
  });
  const selectedDate = resolveSelectedDate(input);
  const dateRange = resolveConversationDetailDateRange(input);

  const whereWithoutDate = combineWhere(
    buildConversationSelectorWhere(conversationSelector),
    actorScopeWhere,
  );
  const whereWithDate = dateRange
    ? combineWhere(whereWithoutDate, buildInteractionDateWhere(dateRange))
    : whereWithoutDate;

  const [rows, rowsForAvailableDates, company] = await Promise.all([
    prisma.historico_conversas.findMany({
      where: withActiveConversationRows(whereWithDate),
      select: {
        id: true,
        timestamp_iso: true,
        data: true,
        created_at: true,
        msg_type: true,
        mensagem: true,
        resposta: true,
        cliente_nome: true,
      },
      orderBy: [{ timestamp_iso: 'asc' }, { created_at: 'asc' }],
    }),
    prisma.historico_conversas.findMany({
      where: withActiveConversationRows(whereWithoutDate),
      select: {
        timestamp_iso: true,
        data: true,
        created_at: true,
      },
    }),
    baseConversation.company_id
      ? prisma.company.findFirst({
          where: {
            id: baseConversation.company_id,
          },
          select: {
            name: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const messages = rows.flatMap<ConversationTimelineMessage>((row) => {
    const timestamp = resolveInteractionDate({
      timestamp_iso: row.timestamp_iso,
      data: row.data,
      created_at: row.created_at,
    });
    if (!timestamp) {
      return [];
    }

    const mappedMessages: ConversationTimelineMessage[] = [];
    const cliente_nome = sanitizeDisplayText(row.cliente_nome);
    const messageType = sanitizeDisplayText(row.msg_type) ?? 'text';

    if (row.mensagem) {
      mappedMessages.push({
        id: `${row.id}:in`,
        historico_id: row.id,
        sender: 'vendedor',
        text: row.mensagem,
        message_type: messageType,
        timestamp,
        cliente_nome,
      });
    }

    if (row.resposta) {
      mappedMessages.push({
        id: `${row.id}:out`,
        historico_id: row.id,
        sender: 'handsell',
        text: row.resposta,
        message_type: 'text',
        timestamp,
        cliente_nome,
      });
    }

    return mappedMessages;
  });

  const availableDates = extractAvailableDates(rowsForAvailableDates);

  return {
    id: baseConversation.id,
    company_id: baseConversation.company_id ?? null,
    company_name: company?.name ?? null,
    vendedor_nome,
    vendedor_telefone: vendedor_telefone ?? null,
    cliente_nome: sanitizeDisplayText(baseConversation.cliente_nome),
    selected_date: selectedDate,
    available_dates: availableDates,
    total_mensagens: messages.length,
    mensagens: messages,
  };
}

export async function deleteConversation(actor: AuthActor, conversation_id: string) {
  const baseConversation = await prisma.historico_conversas.findFirst({
    where: {
      id: conversation_id,
      deleted_at: null,
    },
    select: {
      id: true,
      user_id: true,
      company_id: true,
      vendedor_nome: true,
      vendedor_telefone: true,
    },
  });

  if (!baseConversation) {
    throw notFound('Conversa nÃ£o encontrada');
  }

  if (actor.role !== UserRole.ADMIN) {
    if (!actor.company_id) {
      throw forbidden('UsuÃ¡rio nÃ£o vinculado Ã  empresa');
    }

    if (!baseConversation.company_id || baseConversation.company_id !== actor.company_id) {
      throw forbidden('VocÃª nÃ£o tem acesso a esta conversa');
    }
  }

  const actorScopeWhere = await buildConversationActorScopeWhere(
    actor,
    baseConversation.company_id ?? null,
  );

  if (Object.keys(actorScopeWhere).length > 0) {
    const scopedConversation = await prisma.historico_conversas.findFirst({
      where: combineWhere(
        {
          id: conversation_id,
          deleted_at: null,
        },
        actorScopeWhere,
      ),
      select: {
        id: true,
      },
    });

    if (!scopedConversation) {
      throw forbidden('Voce nao tem acesso a esta conversa');
    }
  }

  const conversationSelector = resolveConversationSelector({
    company_id: baseConversation.company_id,
    user_id: baseConversation.user_id,
    vendedor_telefone: baseConversation.vendedor_telefone,
    vendedor_nome: baseConversation.vendedor_nome,
    unknown_key: baseConversation.id,
  });
  const now = new Date();
  const sellerName = sanitizeDisplayText(baseConversation.vendedor_nome);
  const sellerPhone = normalizeConversationPhone(baseConversation.vendedor_telefone);
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const deletedRows = await tx.historico_conversas.updateMany({
      where: withActiveConversationRows(
        combineWhere(buildConversationSelectorWhere(conversationSelector), actorScopeWhere),
      ),
      data: {
        deleted_at: now,
      },
    });

    if (deletedRows.count === 0) {
      throw notFound('Conversa nÃ£o encontrada');
    }

    await tx.conversationDeletionAudit.create({
      data: {
        id: createUuidV7(),
        targetConversationId: baseConversation.id,
        targetCompanyId: baseConversation.company_id,
        targetUserId: baseConversation.user_id,
        sellerName,
        sellerPhone,
        deletedRowsCount: deletedRows.count,
        actorUserId: actor.user_id,
        actorRole: actor.role,
        deleted_at: now,
      },
    });

    return deletedRows;
  });

  return {
    deleted_at: now,
    deleted_count: result.count,
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

async function buildConversationActorScopeWhere(
  actor: AuthActor,
  company_id: string | null,
): Promise<Prisma.historico_conversasWhereInput> {
  if (actor.role === UserRole.ADMIN || actor.role === UserRole.DIRETOR) {
    return EMPTY_WHERE;
  }

  if (!company_id) {
    return {
      id: '00000000-0000-0000-0000-000000000000',
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

    return buildRestrictedConversationScopeWhere({
      isRestricted: true,
      allowedUserIds: [...supervisors.map((supervisor) => supervisor.id), ...vendors.map((vendor) => vendor.id)],
      allowedPhones: [
        ...supervisors.map((supervisor) => normalizePhone(supervisor.phone)),
        ...vendors.map((vendor) => normalizePhone(vendor.phone)),
      ],
    });
  }

  if (actor.role === UserRole.SUPERVISOR) {
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

    return buildRestrictedConversationScopeWhere({
      isRestricted: true,
      allowedUserIds: vendors.map((vendor) => vendor.id),
      allowedPhones: vendors.map((vendor) => normalizePhone(vendor.phone)),
    });
  }

  throw forbidden('Voce nao tem acesso ao historico de conversas');
}

function buildRestrictedConversationScopeWhere(input: {
  isRestricted: boolean;
  allowedUserIds: string[];
  allowedPhones: string[];
}): Prisma.historico_conversasWhereInput {
  if (!input.isRestricted) {
    return EMPTY_WHERE;
  }

  const allowedUserIds = Array.from(new Set(input.allowedUserIds.filter((value) => value.length > 0)));
  const allowedPhones = Array.from(new Set(input.allowedPhones.filter((value) => value.length > 0)));
  const orFilters: Prisma.historico_conversasWhereInput[] = [];

  if (allowedUserIds.length > 0) {
    orFilters.push({
      user_id: {
        in: allowedUserIds,
      },
    });
  }

  if (allowedPhones.length > 0) {
    orFilters.push({
      vendedor_telefone: {
        in: allowedPhones,
      },
    });
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

function resolveConversationDetailDateRange(input: ConversationDetailInput) {
  if (input.date) {
    return parseDateRange(input.date, input.date);
  }

  return parseDateRange(input.start_date, input.end_date);
}

function resolveSelectedDate(input: ConversationDetailInput) {
  if (input.date) {
    return input.date;
  }

  if (input.start_date && input.end_date && input.start_date === input.end_date) {
    return input.start_date;
  }

  return null;
}

async function resolveSellerIdentityScopeByName(
  company_id: string | null,
  query?: string,
): Promise<SellerIdentityScope> {
  const normalizedQuery = sanitizeDisplayText(query);
  if (!normalizedQuery) {
    return {
      userIds: [],
      phones: [],
    };
  }

  const users = await prisma.user.findMany({
    where: {
      deleted_at: null,
      ...(company_id
        ? {
            company_id,
          }
        : {}),
      full_name: {
        contains: normalizedQuery,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      phone: true,
    },
  });

  return {
    userIds: Array.from(new Set(users.map((user) => user.id).filter((id) => id.length > 0))),
    phones: Array.from(new Set(users.map((user) => normalizeConversationPhone(user.phone)).filter(isNonEmptyString))),
  };
}

function buildConversationListWhere(input: {
  company_id: string | null;
  range: DateRange | null;
  q?: string;
  vendedor_nome?: string;
  vendedor_telefone?: string;
  seller_name_scope: SellerIdentityScope;
  query_seller_scope: SellerIdentityScope;
}): Prisma.historico_conversasWhereInput {
  const andFilters: Prisma.historico_conversasWhereInput[] = [
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
    andFilters.push(buildInteractionDateWhere(input.range));
  }

  const vendedor_nome = sanitizeDisplayText(input.vendedor_nome);
  if (vendedor_nome) {
    const sellerNameOrFilters: Prisma.historico_conversasWhereInput[] = [];

    if (input.seller_name_scope.userIds.length > 0) {
      sellerNameOrFilters.push({
        user_id: {
          in: input.seller_name_scope.userIds,
        },
      });
    }

    if (input.seller_name_scope.phones.length > 0) {
      sellerNameOrFilters.push({
        vendedor_telefone: {
          in: input.seller_name_scope.phones,
        },
      });
    }

    if (sellerNameOrFilters.length === 0) {
      andFilters.push({
        id: '00000000-0000-0000-0000-000000000000',
      });
    } else {
      andFilters.push({
        OR: sellerNameOrFilters,
      });
    }
  }

  const vendedor_telefone = sanitizeDisplayText(input.vendedor_telefone);
  if (vendedor_telefone) {
    const normalizedPhone = normalizePhone(vendedor_telefone);
    if (!normalizedPhone) {
      throw badRequest('Filtro de telefone inválido');
    }

    andFilters.push({
      vendedor_telefone: normalizedPhone,
    });
  }

  const q = sanitizeDisplayText(input.q);
  if (q) {
    const qDigits = normalizePhone(q);
    const orFilters: Prisma.historico_conversasWhereInput[] = [
      {
        mensagem: {
          contains: q,
          mode: 'insensitive',
        },
      },
      {
        resposta: {
          contains: q,
          mode: 'insensitive',
        },
      },
    ];

    if (qDigits.length > 0) {
      orFilters.push({
        vendedor_telefone: {
          contains: qDigits,
        },
      });
    }

    if (input.query_seller_scope.userIds.length > 0) {
      orFilters.push({
        user_id: {
          in: input.query_seller_scope.userIds,
        },
      });
    }

    if (input.query_seller_scope.phones.length > 0) {
      orFilters.push({
        vendedor_telefone: {
          in: input.query_seller_scope.phones,
        },
      });
    }

    andFilters.push({
      OR: orFilters,
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
    throw badRequest('Período de data inválido');
  }

  if (startAt > endAt) {
    throw badRequest('A data inicial não pode ser maior que a data final');
  }

  return {
    startAt,
    endAt,
  };
}

function buildInteractionDateWhere(range: DateRange): Prisma.historico_conversasWhereInput {
  const dayStart = new Date(range.startAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(range.endAt);
  dayEnd.setUTCHours(23, 59, 59, 999);

  return {
    OR: [
      {
        timestamp_iso: {
          gte: range.startAt,
          lte: range.endAt,
        },
      },
      {
        AND: [
          {
            timestamp_iso: null,
          },
          {
            data: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        ],
      },
      {
        AND: [
          {
            timestamp_iso: null,
          },
          {
            data: null,
          },
          {
            created_at: {
              gte: range.startAt,
              lte: range.endAt,
            },
          },
        ],
      },
    ],
  };
}

function mergeConversationGroups(groups: ConversationGroupingRow[]) {
  const mergedByKey = new Map<string, MergedConversationAccumulator>();

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const selector = resolveConversationSelector({
      company_id: group.company_id,
      user_id: group.user_id,
      vendedor_telefone: group.vendedor_telefone,
      vendedor_nome: group.vendedor_nome,
      unknown_key: `group_${index}`,
    });
    const merge_key = buildConversationMergeKey(selector);
    const currentFirst = resolveInteractionDate(group._min);
    const currentLast = resolveInteractionDate(group._max);
    const currentPhone = normalizeConversationPhone(group.vendedor_telefone);
    const currentName = sanitizeDisplayText(group.vendedor_nome);
    const currentUserId = sanitizeDisplayText(group.user_id);

    const existing = mergedByKey.get(merge_key);
    if (!existing) {
      mergedByKey.set(merge_key, {
        merge_key,
        selector,
        company_id: group.company_id,
        seller_user_id: currentUserId,
        vendedor_nome: currentName,
        vendedor_telefone: currentPhone,
        total_interacoes: group._count._all,
        ultima_interacao_em: currentLast,
        primeira_interacao_em: currentFirst,
      });
      continue;
    }

    existing.total_interacoes += group._count._all;

    if (isMoreRecentDate(currentLast, existing.ultima_interacao_em)) {
      existing.ultima_interacao_em = currentLast;
      if (currentName) {
        existing.vendedor_nome = currentName;
      }
      if (currentPhone) {
        existing.vendedor_telefone = currentPhone;
      }
      if (currentUserId) {
        existing.seller_user_id = currentUserId;
      }
    }

    if (isOlderDate(currentFirst, existing.primeira_interacao_em)) {
      existing.primeira_interacao_em = currentFirst;
    }

    if (!existing.seller_user_id && currentUserId) {
      existing.seller_user_id = currentUserId;
    }

    if (!existing.vendedor_telefone && currentPhone) {
      existing.vendedor_telefone = currentPhone;
    }

    if (!existing.vendedor_nome && currentName) {
      existing.vendedor_nome = currentName;
    }

    if (existing.selector.by === 'name' && selector.by === 'name') {
      for (const name of selector.names) {
        existing.selector.names.add(name);
      }
    }
  }

  return Array.from(mergedByKey.values()).sort((left, right) => {
    const lastCompare = compareDateDesc(left.ultima_interacao_em, right.ultima_interacao_em);
    if (lastCompare !== 0) {
      return lastCompare;
    }

    const firstCompare = compareDateDesc(left.primeira_interacao_em, right.primeira_interacao_em);
    if (firstCompare !== 0) {
      return firstCompare;
    }

    return left.merge_key.localeCompare(right.merge_key);
  });
}

function resolveConversationSelector(input: {
  company_id: string | null;
  user_id: string | null;
  vendedor_telefone: string | null;
  vendedor_nome: string | null;
  unknown_key: string;
}): ConversationSelector {
  const company_id = input.company_id ?? null;
  const phone = normalizeConversationPhone(input.vendedor_telefone);
  if (phone) {
    return {
      by: 'phone',
      company_id,
      phone,
    };
  }

  const user_id = sanitizeDisplayText(input.user_id);
  if (user_id) {
    return {
      by: 'user',
      company_id,
      user_id,
    };
  }

  const name = sanitizeDisplayText(input.vendedor_nome);
  if (name) {
    return {
      by: 'name',
      company_id,
      name_key: normalizeNameKey(name),
      names: new Set([name]),
    };
  }

  return {
    by: 'raw',
    company_id,
    user_id: user_id ?? null,
    vendedor_telefone: phone,
    vendedor_nome: name,
    unique_key: input.unknown_key,
  };
}

function buildConversationSelectorWhere(
  selector: ConversationSelector,
): Prisma.historico_conversasWhereInput {
  const andFilters: Prisma.historico_conversasWhereInput[] = [];

  andFilters.push({
    company_id: selector.company_id,
  });

  if (selector.by === 'user') {
    andFilters.push({
      user_id: selector.user_id,
    });
  } else if (selector.by === 'phone') {
    andFilters.push({
      vendedor_telefone: selector.phone,
    });
  } else if (selector.by === 'name') {
    const names = Array.from(selector.names);
    if (names.length === 1) {
      andFilters.push({
        vendedor_nome: names[0],
      });
    } else if (names.length > 1) {
      andFilters.push({
        OR: names.map((name) => ({
          vendedor_nome: name,
        })),
      });
    }
  } else {
    andFilters.push({
      user_id: selector.user_id,
    });
    andFilters.push({
      vendedor_telefone: selector.vendedor_telefone,
    });
    andFilters.push({
      vendedor_nome: selector.vendedor_nome,
    });
  }

  if (andFilters.length === 0) {
    return EMPTY_WHERE;
  }

  return {
    AND: andFilters,
  };
}

function buildConversationMergeKey(selector: ConversationSelector) {
  const company_key = selector.company_id ?? '__no_company__';

  if (selector.by === 'user') {
    return `user:${company_key}:${selector.user_id}`;
  }

  if (selector.by === 'phone') {
    return `phone:${company_key}:${selector.phone}`;
  }

  if (selector.by === 'name') {
    return `name:${company_key}:${selector.name_key}`;
  }

  return `raw:${company_key}:${selector.unique_key}`;
}

function combineWhere(
  left: Prisma.historico_conversasWhereInput,
  right: Prisma.historico_conversasWhereInput,
): Prisma.historico_conversasWhereInput {
  const leftIsEmpty = Object.keys(left).length === 0;
  const rightIsEmpty = Object.keys(right).length === 0;

  if (leftIsEmpty) {
    return right;
  }

  if (rightIsEmpty) {
    return left;
  }

  return {
    AND: [left, right],
  };
}

function withActiveConversationRows(where: Prisma.historico_conversasWhereInput) {
  return combineWhere(
    {
      deleted_at: null,
    },
    where,
  );
}

function resolveSellerDisplayName(input: {
  userNameById: string | null;
  sellerPhone: string | null;
}) {
  return (
    input.userNameById ??
    input.sellerPhone ??
    'Vendedor sem nome'
  );
}

function compareDateDesc(left: Date | null, right: Date | null) {
  if (left && right) {
    return right.getTime() - left.getTime();
  }

  if (right) {
    return 1;
  }

  if (left) {
    return -1;
  }

  return 0;
}

function isMoreRecentDate(candidate: Date | null, current: Date | null) {
  if (!candidate) {
    return false;
  }

  if (!current) {
    return true;
  }

  return candidate.getTime() > current.getTime();
}

function isOlderDate(candidate: Date | null, current: Date | null) {
  if (!candidate) {
    return false;
  }

  if (!current) {
    return true;
  }

  return candidate.getTime() < current.getTime();
}

function normalizeNameKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeConversationPhone(value: string | null | undefined) {
  const normalized = normalizePhone(value ?? '');
  if (normalized.length > 0) {
    return normalized;
  }

  return sanitizeDisplayText(value ?? null);
}

function isNonEmptyString(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0;
}

function sanitizeDisplayText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveInteractionDate(row: InteractionRowForDate): Date | null {
  return row.timestamp_iso ?? row.data ?? row.created_at ?? null;
}

function extractAvailableDates(rows: InteractionRowForDate[]) {
  const dates = new Set<string>();

  for (const row of rows) {
    const date = resolveInteractionDate(row);
    if (!date) {
      continue;
    }

    dates.add(date.toISOString().slice(0, 10));
  }

  return Array.from(dates).sort((left, right) => right.localeCompare(left));
}


