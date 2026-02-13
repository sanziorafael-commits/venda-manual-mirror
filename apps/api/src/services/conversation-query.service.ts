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
  const pagination = getPagination(input.page, input.pageSize);
  const scopedCompanyId = resolveScopedCompanyId(actor, input.companyId);
  const range = parseDateRange(input.startDate, input.endDate);
  const where = buildConversationListWhere({
    companyId: scopedCompanyId,
    range,
    q: input.q,
    vendedorNome: input.vendedorNome,
    vendedorTelefone: input.vendedorTelefone,
    clienteNome: input.clienteNome,
  });

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

      const [latestRow, distinctClients] = await Promise.all([
        prisma.historico_conversas.findFirst({
          where: scopedGroupWhere,
          select: {
            id: true,
            timestamp_iso: true,
            data: true,
            created_at: true,
            vendedor_nome: true,
            vendedor_telefone: true,
            cliente_nome: true,
          },
          orderBy: [{ timestamp_iso: 'desc' }, { created_at: 'desc' }],
        }),
        prisma.historico_conversas.findMany({
          where: scopedGroupWhere,
          select: {
            cliente_nome: true,
          },
          distinct: ['cliente_nome'],
        }),
      ]);

      if (!latestRow) {
        return null;
      }

      const clientesUnicos = distinctClients.reduce((totalCount, row) => {
        return sanitizeDisplayText(row.cliente_nome) ? totalCount + 1 : totalCount;
      }, 0);

      return {
        id: latestRow.id,
        companyId: group.company_id ?? null,
        companyName: null,
        vendedorNome:
          sanitizeDisplayText(latestRow.vendedor_nome) ??
          sanitizeDisplayText(group.vendedor_nome) ??
          sanitizeDisplayText(latestRow.vendedor_telefone) ??
          'Vendedor sem nome',
        vendedorTelefone: sanitizeDisplayText(latestRow.vendedor_telefone),
        ultimoClienteNome: sanitizeDisplayText(latestRow.cliente_nome),
        totalInteracoes: group._count._all,
        clientesUnicos,
        ultimaInteracaoEm: resolveInteractionDate({
          timestamp_iso: latestRow.timestamp_iso,
          data: latestRow.data,
          created_at: latestRow.created_at,
        }),
        primeiraInteracaoEm:
          group._min.timestamp_iso ?? group._min.created_at ?? latestRow.created_at ?? null,
      };
    }),
  );

  const items = itemsWithoutCompanyName.filter((item): item is ConversationListItem => Boolean(item));

  const companyIds = Array.from(
    new Set(items.map((item) => item.companyId).filter((companyId): companyId is string => Boolean(companyId))),
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
      companyName: item.companyId ? companyNameById.get(item.companyId) ?? null : null,
    })),
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  };
}

export async function getConversationById(
  actor: AuthActor,
  conversationId: string,
  input: ConversationDetailInput,
) {
  const baseConversation = await prisma.historico_conversas.findFirst({
    where: {
      id: conversationId,
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
    if (!actor.companyId) {
      throw forbidden('Usuário não vinculado à empresa');
    }

    if (!baseConversation.company_id || baseConversation.company_id !== actor.companyId) {
      throw forbidden('Você não tem acesso a esta conversa');
    }
  }

  const vendedorTelefone = sanitizeDisplayText(baseConversation.vendedor_telefone);
  const vendedorNome = sanitizeDisplayText(baseConversation.vendedor_nome);

  if (!vendedorTelefone && !vendedorNome) {
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

  if (vendedorTelefone) {
    sharedWhereFilters.push({
      vendedor_telefone: normalizePhone(vendedorTelefone),
    });
  } else if (baseConversation.vendedor_nome) {
    sharedWhereFilters.push({
      vendedor_nome: baseConversation.vendedor_nome,
    });
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
    const clienteNome = sanitizeDisplayText(row.cliente_nome);
    const messageType = sanitizeDisplayText(row.msg_type) ?? 'text';

    if (row.mensagem) {
      mappedMessages.push({
        id: `${row.id}:in`,
        historicoId: row.id,
        sender: 'vendedor',
        text: row.mensagem,
        messageType,
        timestamp,
        clienteNome,
      });
    }

    if (row.resposta) {
      mappedMessages.push({
        id: `${row.id}:out`,
        historicoId: row.id,
        sender: 'handsell',
        text: row.resposta,
        messageType: 'text',
        timestamp,
        clienteNome,
      });
    }

    return mappedMessages;
  });

  const availableDates = extractAvailableDates(rowsForAvailableDates);

  return {
    id: baseConversation.id,
    companyId: baseConversation.company_id ?? null,
    companyName: company?.name ?? null,
    vendedorNome: vendedorNome ?? 'Vendedor sem nome',
    vendedorTelefone: vendedorTelefone ?? null,
    clienteNome: sanitizeDisplayText(baseConversation.cliente_nome),
    selectedDate,
    availableDates,
    totalMensagens: messages.length,
    mensagens: messages,
  };
}

function resolveScopedCompanyId(actor: AuthActor, requestedCompanyId?: string) {
  if (actor.role === UserRole.ADMIN) {
    return requestedCompanyId ?? null;
  }

  if (!actor.companyId) {
    throw forbidden('Usuário não vinculado à empresa');
  }

  return actor.companyId;
}

function resolveConversationDetailDateRange(input: ConversationDetailInput) {
  if (input.date) {
    return parseDateRange(input.date, input.date);
  }

  return parseDateRange(input.startDate, input.endDate);
}

function resolveSelectedDate(input: ConversationDetailInput) {
  if (input.date) {
    return input.date;
  }

  if (input.startDate && input.endDate && input.startDate === input.endDate) {
    return input.startDate;
  }

  return null;
}

function buildConversationListWhere(input: {
  companyId: string | null;
  range: DateRange | null;
  q?: string;
  vendedorNome?: string;
  vendedorTelefone?: string;
  clienteNome?: string;
}): Prisma.historico_conversasWhereInput {
  const andFilters: Prisma.historico_conversasWhereInput[] = [];

  if (input.companyId) {
    andFilters.push({
      company_id: input.companyId,
    });
  }

  if (input.range) {
    andFilters.push(buildInteractionDateWhere(input.range));
  }

  const vendedorNome = sanitizeDisplayText(input.vendedorNome);
  if (vendedorNome) {
    andFilters.push({
      vendedor_nome: {
        contains: vendedorNome,
        mode: 'insensitive',
      },
    });
  }

  const vendedorTelefone = sanitizeDisplayText(input.vendedorTelefone);
  if (vendedorTelefone) {
    const normalizedPhone = normalizePhone(vendedorTelefone);
    if (!normalizedPhone) {
      throw badRequest('Filtro de telefone inválido');
    }

    andFilters.push({
      vendedor_telefone: normalizedPhone,
    });
  }

  const clienteNome = sanitizeDisplayText(input.clienteNome);
  if (clienteNome) {
    andFilters.push({
      cliente_nome: {
        contains: clienteNome,
        mode: 'insensitive',
      },
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
        cliente_nome: {
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
