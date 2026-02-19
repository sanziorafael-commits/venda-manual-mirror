import { prisma } from '../lib/prisma.js';
import type { ConversationWebhookMessageInput } from '../schemas/conversation.schema.js';
import { normalizePhone } from '../utils/normalizers.js';

import { resolveSellerScopeByPhone } from './seller-scope-resolver.service.js';

type NormalizedConversationWebhookInput = {
  timestampIso: Date | null;
  senderId: string | null;
  date: Date | null;
  msgType: string | null;
  flowName: string | null;
  executionId: string | null;
  messageId: string | null;
  mensagem: string | null;
  resposta: string | null;
  vendedorNome: string | null;
  vendedorTelefone: string | null;
  supervisor: string | null;
  clienteNome: string | null;
  leadsEncontrados: string | null;
  companyId: string | null;
  userId: string | null;
  source: string | null;
};

type MentionMethod = 'code_exact' | 'name_exact' | 'name_fuzzy';

type DetectedProductMention = {
  productId: string;
  method: MentionMethod;
  score: number;
};

type ProductMatcherEntry = {
  id: string;
  normalizedName: string;
  nameTokens: string[];
  normalizedCodes: string[];
};

const MAX_PRODUCTS_PER_MESSAGE = 5;
const MIN_TOKEN_SIMILARITY_FOR_MATCH = 0.75;
const MIN_FUZZY_MATCH_RATIO = 0.7;
const MIN_FUZZY_AVERAGE_SIMILARITY = 0.78;
const MIN_PRODUCT_FUZZY_SCORE = 0.84;

const STOPWORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'para',
  'com',
  'sem',
  'por',
  'na',
  'no',
  'nas',
  'nos',
  'uma',
  'um',
  'tipo',
  'linha',
]);

export async function ingestConversationWebhookMessages(messages: ConversationWebhookMessageInput[]) {
  let inserted = 0;
  let linkedProducts = 0;
  const productMatcherCache = new Map<string, ProductMatcherEntry[]>();

  for (const message of messages) {
    const result = await ingestConversationWebhookMessage(message, productMatcherCache);
    inserted += 1;
    linkedProducts += result.linkedProducts;
  }

  return {
    inserted,
    linkedProducts,
  };
}

async function ingestConversationWebhookMessage(
  message: ConversationWebhookMessageInput,
  productMatcherCache: Map<string, ProductMatcherEntry[]>,
) {
  const normalized = normalizeConversationWebhookMessage(message);
  const resolvedScope = await resolveSellerScopeByPhone({
    userId: normalized.userId,
    companyId: normalized.companyId,
    sellerPhone: normalized.vendedorTelefone,
  });

  const record = await prisma.historico_conversas.create({
    data: {
      timestamp_iso: normalized.timestampIso ?? undefined,
      sender_id: normalized.senderId ?? undefined,
      data: normalized.date ?? undefined,
      msg_type: normalized.msgType ?? undefined,
      flow_name: normalized.flowName ?? undefined,
      execution_id: normalized.executionId ?? undefined,
      message_id: normalized.messageId ?? undefined,
      mensagem: normalized.mensagem ?? undefined,
      resposta: normalized.resposta ?? undefined,
      vendedor_nome: normalized.vendedorNome ?? undefined,
      vendedor_telefone: normalized.vendedorTelefone ?? undefined,
      supervisor: normalized.supervisor ?? undefined,
      cliente_nome: normalized.clienteNome ?? undefined,
      leads_encontrados: normalized.leadsEncontrados ?? undefined,
      user_id: resolvedScope.userId ?? undefined,
      company_id: resolvedScope.companyId ?? undefined,
    },
    select: {
      id: true,
      timestamp_iso: true,
      created_at: true,
    },
  });

  const detectedMentions = await detectMentionedProductsFromText({
    messageText: normalized.mensagem,
    responseText: normalized.resposta,
    companyId: resolvedScope.companyId,
    productMatcherCache,
  });

  const linkedProducts = await linkMentionedProducts({
    historicoId: record.id,
    mentions: detectedMentions,
    companyId: resolvedScope.companyId,
    citedAt: record.timestamp_iso ?? record.created_at ?? new Date(),
    sourcePrefix: normalized.source ?? 'auto_text_v1',
  });

  return {
    id: record.id,
    linkedProducts,
  };
}

async function detectMentionedProductsFromText(input: {
  messageText: string | null;
  responseText: string | null;
  companyId: string | null;
  productMatcherCache: Map<string, ProductMatcherEntry[]>;
}) {
  if (!input.companyId) {
    return [] as DetectedProductMention[];
  }

  const fullText = [input.messageText, input.responseText].filter(Boolean).join('\n');
  const normalizedText = normalizeForMatching(fullText);
  if (!normalizedText) {
    return [] as DetectedProductMention[];
  }

  const textAlphaNumeric = normalizeAlphaNumeric(fullText);
  const textTokens = extractMeaningfulTokens(normalizedText);
  if (textTokens.length === 0 && !textAlphaNumeric) {
    return [] as DetectedProductMention[];
  }

  const productEntries = await getCompanyProductMatcherEntries(
    input.companyId,
    input.productMatcherCache,
  );

  const mentions: DetectedProductMention[] = [];
  for (const product of productEntries) {
    const directCode = hasExactCodeMatch(textAlphaNumeric, product.normalizedCodes);
    if (directCode) {
      mentions.push({
        productId: product.id,
        method: 'code_exact',
        score: 1,
      });
      continue;
    }

    if (product.normalizedName.length >= 4 && normalizedText.includes(product.normalizedName)) {
      mentions.push({
        productId: product.id,
        method: 'name_exact',
        score: 0.97,
      });
      continue;
    }

    const fuzzyScore = computeFuzzyProductScore(product.nameTokens, textTokens);
    if (!fuzzyScore || fuzzyScore < MIN_PRODUCT_FUZZY_SCORE) {
      continue;
    }

    mentions.push({
      productId: product.id,
      method: 'name_fuzzy',
      score: fuzzyScore,
    });
  }

  return mentions.sort((left, right) => right.score - left.score).slice(0, MAX_PRODUCTS_PER_MESSAGE);
}

async function getCompanyProductMatcherEntries(
  companyId: string,
  cache: Map<string, ProductMatcherEntry[]>,
) {
  const cached = cache.get(companyId);
  if (cached) {
    return cached;
  }

  const products = await prisma.produtos.findMany({
    where: {
      company_id: companyId,
    },
    select: {
      id: true,
      nome: true,
      codigo_interno_sku: true,
      codigo_barras_ean: true,
      codigo_barras_dun: true,
    },
  });

  const entries = products.map<ProductMatcherEntry>((product) => {
    const normalizedName = normalizeForMatching(product.nome);
    return {
      id: product.id,
      normalizedName,
      nameTokens: extractMeaningfulTokens(normalizedName),
      normalizedCodes: [product.codigo_interno_sku, product.codigo_barras_ean, product.codigo_barras_dun]
        .map((code) => normalizeAlphaNumeric(code ?? ''))
        .filter((code) => code.length >= 4),
    };
  });

  cache.set(companyId, entries);
  return entries;
}

function hasExactCodeMatch(textAlphaNumeric: string, normalizedCodes: string[]) {
  if (!textAlphaNumeric || normalizedCodes.length === 0) {
    return false;
  }

  return normalizedCodes.some((code) => textAlphaNumeric.includes(code));
}

function computeFuzzyProductScore(productTokens: string[], textTokens: string[]) {
  if (productTokens.length < 2 || textTokens.length === 0) {
    return null;
  }

  let matchedCount = 0;
  let tokenScoreSum = 0;

  for (const productToken of productTokens) {
    let bestScore = 0;
    for (const textToken of textTokens) {
      const similarity = tokenSimilarity(productToken, textToken);
      if (similarity > bestScore) {
        bestScore = similarity;
      }

      if (bestScore >= 1) {
        break;
      }
    }

    tokenScoreSum += bestScore;
    if (bestScore >= MIN_TOKEN_SIMILARITY_FOR_MATCH) {
      matchedCount += 1;
    }
  }

  const matchRatio = matchedCount / productTokens.length;
  const averageSimilarity = tokenScoreSum / productTokens.length;

  if (matchRatio < MIN_FUZZY_MATCH_RATIO || averageSimilarity < MIN_FUZZY_AVERAGE_SIMILARITY) {
    return null;
  }

  return averageSimilarity * 0.6 + matchRatio * 0.4;
}

function tokenSimilarity(left: string, right: string) {
  const collapsedLeft = collapseRepeatedCharacters(left);
  const collapsedRight = collapseRepeatedCharacters(right);

  if (collapsedLeft.length >= 4 && collapsedLeft === collapsedRight) {
    return 0.98;
  }

  return Math.max(
    rawTokenSimilarity(left, right),
    rawTokenSimilarity(collapsedLeft, right),
    rawTokenSimilarity(left, collapsedRight),
    rawTokenSimilarity(collapsedLeft, collapsedRight),
  );
}

function rawTokenSimilarity(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.length >= 6 && (left.includes(right) || right.includes(left))) {
    return 0.9;
  }

  const distance = levenshteinDistance(left, right);
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) {
    return 0;
  }

  const similarity = 1 - distance / maxLength;
  return similarity > 0 ? similarity : 0;
}

function levenshteinDistance(left: string, right: string) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j < cols; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return matrix[left.length][right.length];
}

async function linkMentionedProducts(input: {
  historicoId: string;
  mentions: DetectedProductMention[];
  companyId: string | null;
  citedAt: Date;
  sourcePrefix: string;
}) {
  if (input.mentions.length === 0) {
    return 0;
  }

  const rows = input.mentions.map((mention) => ({
    historico_id: input.historicoId,
    produto_id: mention.productId,
    company_id: input.companyId,
    cited_at: input.citedAt,
    source: `${input.sourcePrefix}:${mention.method}:${mention.score.toFixed(2)}`,
  }));

  const result = await prisma.historico_conversas_produtos.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return result.count;
}

function normalizeConversationWebhookMessage(
  message: ConversationWebhookMessageInput,
): NormalizedConversationWebhookInput {
  const timestampIso = parseDateTime(message.timestamp_iso ?? message.timestampIso ?? null);
  const date = parseDateTime(message.data ?? null);
  const vendedorTelefone = normalizePhone(message.vendedor_telefone ?? message.vendedorTelefone ?? '');

  return {
    timestampIso,
    senderId: normalizeText(message.sender_id ?? message.senderId ?? null),
    date,
    msgType: normalizeText(message.msg_type ?? message.msgType ?? null),
    flowName: normalizeText(message.flow_name ?? message.flowName ?? null),
    executionId: normalizeText(message.execution_id ?? message.executionId ?? null),
    messageId: normalizeText(message.message_id ?? message.messageId ?? null),
    mensagem: normalizeText(message.mensagem ?? null),
    resposta: normalizeText(message.resposta ?? null),
    vendedorNome: normalizeText(message.vendedor_nome ?? message.vendedorNome ?? null),
    vendedorTelefone: vendedorTelefone || null,
    supervisor: normalizeText(message.supervisor ?? null),
    clienteNome: normalizeText(message.cliente_nome ?? message.clienteNome ?? null),
    leadsEncontrados: normalizeText(message.leads_encontrados ?? message.leadsEncontrados ?? null),
    companyId: normalizeText(message.company_id ?? message.companyId ?? null),
    userId: normalizeText(message.user_id ?? message.userId ?? null),
    source: normalizeText(message.source ?? null),
  };
}

function parseDateTime(value: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeForMatching(value: string | null) {
  if (!value) {
    return '';
  }

  return normalizeLeetSpeak(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAlphaNumeric(value: string | null) {
  if (!value) {
    return '';
  }

  return normalizeLeetSpeak(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeLeetSpeak(value: string) {
  return value
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b');
}

function collapseRepeatedCharacters(value: string) {
  return value.replace(/([a-z0-9])\1+/g, '$1');
}

function extractMeaningfulTokens(normalizedValue: string) {
  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}
