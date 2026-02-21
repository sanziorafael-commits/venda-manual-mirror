import { UserRole, type Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type {
  ConversationDetailInput,
  ConversationListInput,
  ConversationListItem,
  ConversationTimelineMessage,
} from '../types/conversation.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { normalizePhone } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';

type DateRange = {
  startAt: Date;
  endAt: Date;
};

type InteractionRowForDate = {
  timestamp_iso: Date | null;
  data: Date | null;
  created_at: Date | null;
};

const EMPTY_WHERE: Prisma.historico_conversasWhereInput = {};

export async function listConversations(actor: AuthActor, input: ConversationListInput) {
  const pagination = getPagination(input.page, input.page_size);
  const scopedCompanyId = resolveScopedCompanyId(actor, input.company_id);
  const range = parseDateRange(input.start_date, input.end_date);
  const baseWhere = buildConversationListWhere({
    company_id: scopedCompanyId,
    range,
    q: input.q,
    vendedor_nome: input.vendedor_nome,
    vendedor_telefone: input.vendedor_telefone,
  });
  const actorScopeWhere = await buildConversationActorScopeWhere(actor, scopedCompanyId);
  const where = combineWhere(baseWhere, actorScopeWhere);

  const grouped = await prisma.historico_conversas.groupBy({
    by: ['company_id', 'vendedor_telefone', 'vendedor_nome'],
    where,
    _count: {
      _all: true,
    },
    _max: {
      timestamp_iso: true,
      created_at: true,
    },
    _min: {
      timestamp_iso: true,
      created_at: true,
    },
    orderBy: [{ _max: { timestamp_iso: 'desc' } }, { _max: { created_at: 'desc' } }],
  });

  const total = grouped.length;
  const pagedGroups = grouped.slice(pagination.skip, pagination.skip + pagination.take);

  const itemsWithoutCompanyName = await Promise.all(
    pagedGroups.map(async (group): Promise<ConversationListItem | null> => {
      const groupKeyWhere = buildGroupKeyWhere(group);
      const scopedGroupWhere = combineWhere(where, groupKeyWhere);

      const latestRow = await prisma.historico_conversas.findFirst({
        where: scopedGroupWhere,
        select: {
          id: true,
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
        company_name: null,
        vendedor_nome:
          sanitizeDisplayText(latestRow.vendedor_nome) ??
          sanitizeDisplayText(group.vendedor_nome) ??
          sanitizeDisplayText(latestRow.vendedor_telefone) ??
          'Vendedor sem nome',
        vendedor_telefone: sanitizeDisplayText(latestRow.vendedor_telefone),
        total_interacoes: group._count._all,
        ultima_interacao_em: resolveInteractionDate({
          timestamp_iso: latestRow.timestamp_iso,
          data: latestRow.data,
          created_at: latestRow.created_at,
        }),
        primeira_interacao_em:
          group._min.timestamp_iso ?? group._min.created_at ?? latestRow.created_at ?? null,
      };
    }),
  );

  const items = itemsWithoutCompanyName.filter((item): item is ConversationListItem => Boolean(item));

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
      ...item,
      company_name: item.company_id ? companyNameById.get(item.company_id) ?? null : null,
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
    },
    select: {
      id: true,
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
  const vendedor_nome = sanitizeDisplayText(baseConversation.vendedor_nome);

  if (!vendedor_telefone && !vendedor_nome) {
    throw notFound('Não foi possível identificar o vendedor desta conversa');
  }

  const selectedDate = resolveSelectedDate(input);
  const dateRange = resolveConversationDetailDateRange(input);

  const sharedWhereFilters: Prisma.historico_conversasWhereInput[] = [];
  if (baseConversation.company_id) {
    sharedWhereFilters.push({
      company_id: baseConversation.company_id,
    });
  }

  if (vendedor_telefone) {
    sharedWhereFilters.push({
      vendedor_telefone: normalizePhone(vendedor_telefone),
    });
  } else if (baseConversation.vendedor_nome) {
    sharedWhereFilters.push({
      vendedor_nome: baseConversation.vendedor_nome,
    });
  }
  if (Object.keys(actorScopeWhere).length > 0) {
    sharedWhereFilters.push(actorScopeWhere);
  }

  const whereWithoutDate =
    sharedWhereFilters.length > 0 ? { AND: sharedWhereFilters } : EMPTY_WHERE;
  const whereWithDate = dateRange
    ? combineWhere(whereWithoutDate, buildInteractionDateWhere(dateRange))
    : whereWithoutDate;

  const [rows, rowsForAvailableDates, company] = await Promise.all([
    prisma.historico_conversas.findMany({
      where: whereWithDate,
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
      where: whereWithoutDate,
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
    vendedor_nome: vendedor_nome ?? 'Vendedor sem nome',
    vendedor_telefone: vendedor_telefone ?? null,
    cliente_nome: sanitizeDisplayText(baseConversation.cliente_nome),
    selected_date: selectedDate,
    available_dates: availableDates,
    total_mensagens: messages.length,
    mensagens: messages,
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

function buildConversationListWhere(input: {
  company_id: string | null;
  range: DateRange | null;
  q?: string;
  vendedor_nome?: string;
  vendedor_telefone?: string;
}): Prisma.historico_conversasWhereInput {
  const andFilters: Prisma.historico_conversasWhereInput[] = [];

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
    andFilters.push({
      vendedor_nome: {
        contains: vendedor_nome,
        mode: 'insensitive',
      },
    });
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
        vendedor_nome: {
          contains: q,
          mode: 'insensitive',
        },
      },
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

function buildGroupKeyWhere(group: {
  company_id: string | null;
  vendedor_telefone: string | null;
  vendedor_nome: string | null;
}): Prisma.historico_conversasWhereInput {
  return {
    AND: [
      {
        company_id: group.company_id,
      },
      {
        vendedor_telefone: group.vendedor_telefone,
      },
      {
        vendedor_nome: group.vendedor_nome,
      },
    ],
  };
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


