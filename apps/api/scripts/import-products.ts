import { promises as fs } from 'node:fs';
import path from 'node:path';

import { Prisma } from '@prisma/client';

import { prisma } from '../src/lib/prisma.js';
import { createUuidV7 } from '../src/utils/uuid.js';

type CliOptions = {
  companyId: string;
  inputJsonPath: string;
  outputCsvPath: string;
  dryRun: boolean;
};

type InputProductRecord = {
  source_rows?: unknown;
  source_file?: unknown;
  company_id?: unknown;
  nome?: unknown;
  descricao_comercial?: unknown;
  codigo_interno_sku?: unknown;
  marca?: unknown;
  categorias?: unknown;
  categoria_outro?: unknown;
  tipologias_clientes?: unknown;
  tipologia_cliente_outro?: unknown;
  sugestoes_receitas?: unknown;
  codigo_barras_ean?: unknown;
  codigo_barras_dun?: unknown;
  codigo_fiscal_ncm?: unknown;
  tipo_conservacao?: unknown;
  tipo_conservacao_outro?: unknown;
  validade_embalagem_fechada?: unknown;
  validade_apos_abertura?: unknown;
  validade_apos_preparo?: unknown;
  instrucoes_conservacao_produto?: unknown;
  restricoes_produto?: unknown;
  unidade_venda?: unknown;
  unidade_venda_outro?: unknown;
  peso_liquido_volume?: unknown;
  peso_bruto?: unknown;
  qtd_unidades_por_caixa?: unknown;
  instrucoes_conservacao_embalagem?: unknown;
  restricoes_embalagem?: unknown;
  possui_ingredientes?: unknown;
  ingredientes?: unknown;
  alergenos?: unknown;
  produto_pronto_uso?: unknown;
  produto_pronto_uso_outro?: unknown;
  modo_preparo?: unknown;
  observacoes_uso?: unknown;
  objecoes_argumentacoes?: unknown;
  fotos_produto?: unknown;
  videos_material?: unknown;
  observacoes_imagens?: unknown;
  informacoes_tecnicas_complementares?: unknown;
  certificacoes_registros?: unknown;
  observacoes_comerciais?: unknown;
  diferenciais_produto?: unknown;
  observacoes_gerais?: unknown;
};

type ProductObjection = {
  objecao_cliente: string;
  tipo_objecao: 'PRECO' | 'QUALIDADE' | 'OPERACAO' | 'LOGISTICA' | 'CONFIANCA' | 'OUTRO';
  tipo_objecao_outro: string | null;
  resposta_argumento: string;
  quando_usar: string | null;
};

type NormalizedProductRecord = {
  source_rows: string | null;
  source_file: string | null;
  company_id: string;
  nome: string;
  descricao_comercial: string | null;
  codigo_interno_sku: string | null;
  marca: string | null;
  categorias: string[];
  categoria_outro: string | null;
  tipologias_clientes: string[];
  tipologia_cliente_outro: string | null;
  sugestoes_receitas: string | null;
  codigo_barras_ean: string | null;
  codigo_barras_dun: string | null;
  codigo_fiscal_ncm: string | null;
  tipo_conservacao: 'CONGELADO' | 'REFRIGERADO' | 'AMBIENTE' | 'OUTRO' | null;
  tipo_conservacao_outro: string | null;
  validade_embalagem_fechada: string | null;
  validade_apos_abertura: string | null;
  validade_apos_preparo: string | null;
  instrucoes_conservacao_produto: string | null;
  restricoes_produto: string | null;
  unidade_venda: 'UNIDADE' | 'CAIXA' | 'LITRO' | 'GALAO' | 'OUTRO' | null;
  unidade_venda_outro: string | null;
  peso_liquido_volume: string | null;
  peso_bruto: string | null;
  qtd_unidades_por_caixa: string | null;
  instrucoes_conservacao_embalagem: string | null;
  restricoes_embalagem: string | null;
  possui_ingredientes: boolean | null;
  ingredientes: string | null;
  alergenos: string | null;
  produto_pronto_uso: 'SIM' | 'NAO' | 'OUTRO' | null;
  produto_pronto_uso_outro: string | null;
  modo_preparo: string | null;
  observacoes_uso: string | null;
  objecoes_argumentacoes: ProductObjection[];
  fotos_produto: string[];
  videos_material: string[];
  observacoes_imagens: string | null;
  informacoes_tecnicas_complementares: string | null;
  certificacoes_registros: string | null;
  observacoes_comerciais: string | null;
  diferenciais_produto: string | null;
  observacoes_gerais: string | null;
};

type ImportResultRow = {
  action: 'created' | 'updated' | 'skipped_invalid';
  nome: string;
  marca: string | null;
  codigo_interno_sku: string | null;
  source_rows: string | null;
  reason: string | null;
  id: string | null;
};

const DEFAULT_COMPANY_ID = '019c9123-681c-72ec-9d7b-74f74cad014a';
const DEFAULT_INPUT_JSON = path.resolve(
  process.cwd(),
  '..',
  '..',
  'exports',
  'focatto_produtos_import_ok.json',
);
const DEFAULT_OUTPUT_CSV = path.resolve(
  process.cwd(),
  '..',
  '..',
  'exports',
  'focatto_produtos_import_result.csv',
);
const TITLE_CASE_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
const ACRONYM_WORDS = ['ean', 'dun', 'gtin', 'ncm', 'iqf', 'sif', 'iso'];

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    companyId: DEFAULT_COMPANY_ID,
    inputJsonPath: DEFAULT_INPUT_JSON,
    outputCsvPath: DEFAULT_OUTPUT_CSV,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith('--company-id=')) {
      options.companyId = arg.slice('--company-id='.length).trim();
      continue;
    }
    if (arg.startsWith('--input=')) {
      options.inputJsonPath = path.resolve(process.cwd(), arg.slice('--input='.length).trim());
      continue;
    }
    if (arg.startsWith('--output=')) {
      options.outputCsvPath = path.resolve(process.cwd(), arg.slice('--output='.length).trim());
      continue;
    }
  }

  return options;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return normalized.length > 0 ? normalized : null;
}

function isMostlyUppercase(value: string) {
  const letters = value.match(/\p{L}/gu) ?? [];
  if (letters.length < 3) {
    return false;
  }

  const uppercaseCount = letters.filter((char) => char === char.toLocaleUpperCase('pt-BR')).length;
  return uppercaseCount / letters.length >= 0.65;
}

function applyAcronyms(value: string) {
  let current = value;
  for (const acronym of ACRONYM_WORDS) {
    const pattern = new RegExp(`\\b${acronym}\\b`, 'gi');
    current = current.replace(pattern, acronym.toUpperCase());
  }
  return current;
}

function toTitleCase(value: string) {
  const lower = value.toLocaleLowerCase('pt-BR');
  const words = lower.split(/\s+/);

  const titled = words.map((word, index) => {
    if (index > 0 && TITLE_CASE_PARTICLES.has(word)) {
      return word;
    }

    return word.replace(/(^|['-])(\p{L})/gu, (_all, prefix: string, char: string) => {
      return `${prefix}${char.toLocaleUpperCase('pt-BR')}`;
    });
  });

  return applyAcronyms(titled.join(' '));
}

function toSentenceCase(value: string) {
  const lower = value.toLocaleLowerCase('pt-BR');
  let capitalizeNext = true;
  let out = '';

  for (const char of lower) {
    if (capitalizeNext && /\p{L}/u.test(char)) {
      out += char.toLocaleUpperCase('pt-BR');
      capitalizeNext = false;
      continue;
    }

    out += char;
    if (char === '.' || char === '!' || char === '?' || char === '\n') {
      capitalizeNext = true;
    }
  }

  return applyAcronyms(out);
}

function normalizeCasedText(value: unknown, mode: 'title' | 'sentence'): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return mode === 'title' ? toTitleCase(normalized) : toSentenceCase(normalized);
}

function normalizeShortText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, 255) : null;
}

function normalizeStringList(value: unknown, mode: 'none' | 'title' | 'sentence' = 'none'): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const tokenRaw = normalizeText(item);
    if (!tokenRaw) {
      continue;
    }

    const token =
      mode === 'title'
        ? normalizeCasedText(tokenRaw, 'title')
        : mode === 'sentence'
          ? normalizeCasedText(tokenRaw, 'sentence')
          : tokenRaw;
    if (!token) {
      continue;
    }
    const key = token.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(token);
  }

  return out;
}

function normalizeUrlList(value: unknown): string[] {
  const urls = normalizeStringList(value);
  return urls.filter((item) => /^https?:\/\//i.test(item));
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', 'sim', 'yes', '1'].includes(v)) {
      return true;
    }
    if (['false', 'nao', 'não', 'no', '0'].includes(v)) {
      return false;
    }
  }

  return null;
}

function normalizeConservationType(
  value: unknown,
): 'CONGELADO' | 'REFRIGERADO' | 'AMBIENTE' | 'OUTRO' | null {
  const normalized = normalizeText(value)?.toUpperCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'CONGELADO') {
    return 'CONGELADO';
  }
  if (normalized === 'REFRIGERADO') {
    return 'REFRIGERADO';
  }
  if (normalized === 'AMBIENTE') {
    return 'AMBIENTE';
  }
  if (normalized === 'OUTRO') {
    return 'OUTRO';
  }

  return null;
}

function normalizeSaleUnit(value: unknown): 'UNIDADE' | 'CAIXA' | 'LITRO' | 'GALAO' | 'OUTRO' | null {
  const normalized = normalizeText(value)?.toUpperCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'UNIDADE') {
    return 'UNIDADE';
  }
  if (normalized === 'CAIXA') {
    return 'CAIXA';
  }
  if (normalized === 'LITRO') {
    return 'LITRO';
  }
  if (normalized === 'GALAO') {
    return 'GALAO';
  }
  if (normalized === 'OUTRO') {
    return 'OUTRO';
  }

  return null;
}

function normalizeReadyToUse(value: unknown): 'SIM' | 'NAO' | 'OUTRO' | null {
  const normalized = normalizeText(value)?.toUpperCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'SIM') {
    return 'SIM';
  }
  if (normalized === 'NAO') {
    return 'NAO';
  }
  if (normalized === 'OUTRO') {
    return 'OUTRO';
  }

  return null;
}

function normalizeObjectionType(
  value: unknown,
): 'PRECO' | 'QUALIDADE' | 'OPERACAO' | 'LOGISTICA' | 'CONFIANCA' | 'OUTRO' {
  const normalized = normalizeText(value)?.toUpperCase();
  if (!normalized) {
    return 'OUTRO';
  }

  if (normalized === 'PRECO') {
    return 'PRECO';
  }
  if (normalized === 'QUALIDADE') {
    return 'QUALIDADE';
  }
  if (normalized === 'OPERACAO') {
    return 'OPERACAO';
  }
  if (normalized === 'LOGISTICA') {
    return 'LOGISTICA';
  }
  if (normalized === 'CONFIANCA') {
    return 'CONFIANCA';
  }

  return 'OUTRO';
}

function normalizeObjections(value: unknown): ProductObjection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const out: ProductObjection[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const row = item as Record<string, unknown>;
    const objecao_cliente = normalizeCasedText(row.objecao_cliente, 'sentence');
    const resposta_argumento = normalizeCasedText(row.resposta_argumento, 'sentence');
    if (!objecao_cliente || !resposta_argumento) {
      continue;
    }

    const tipo_objecao = normalizeObjectionType(row.tipo_objecao);
    let tipo_objecao_outro = normalizeCasedText(row.tipo_objecao_outro, 'sentence');
    if (tipo_objecao === 'OUTRO' && !tipo_objecao_outro) {
      tipo_objecao_outro = 'Nao informado';
    }
    if (tipo_objecao !== 'OUTRO') {
      tipo_objecao_outro = null;
    }

    out.push({
      objecao_cliente,
      tipo_objecao,
      tipo_objecao_outro,
      resposta_argumento,
      quando_usar: normalizeCasedText(row.quando_usar, 'sentence'),
    });
  }

  return out;
}

function csvEscape(value: string | null): string {
  if (value === null) {
    return '';
  }

  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

async function writeResultCsv(pathOutput: string, rows: ImportResultRow[]) {
  const header = [
    'action',
    'nome',
    'marca',
    'codigo_interno_sku',
    'source_rows',
    'reason',
    'id',
  ];
  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.action),
        csvEscape(row.nome),
        csvEscape(row.marca),
        csvEscape(row.codigo_interno_sku),
        csvEscape(row.source_rows),
        csvEscape(row.reason),
        csvEscape(row.id),
      ].join(','),
    );
  }

  await fs.writeFile(pathOutput, `${lines.join('\n')}\n`, 'utf8');
}

function parseInputRows(content: string): InputProductRecord[] {
  const raw = JSON.parse(content) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error('Arquivo JSON invalido: esperado um array de produtos.');
  }

  return raw as InputProductRecord[];
}

function normalizeInputRecord(
  row: InputProductRecord,
  fallbackCompanyId: string,
): NormalizedProductRecord | null {
  const nome = normalizeCasedText(row.nome, 'title');
  if (!nome) {
    return null;
  }

  const tipo_conservacao = normalizeConservationType(row.tipo_conservacao);
  const unidade_venda = normalizeSaleUnit(row.unidade_venda);
  const produto_pronto_uso = normalizeReadyToUse(row.produto_pronto_uso);

  return {
    source_rows: normalizeText(row.source_rows),
    source_file: normalizeText(row.source_file),
    company_id: normalizeText(row.company_id) ?? fallbackCompanyId,
    nome,
    descricao_comercial: normalizeCasedText(row.descricao_comercial, 'sentence'),
    codigo_interno_sku: normalizeShortText(row.codigo_interno_sku),
    marca: normalizeCasedText(row.marca, 'title')?.slice(0, 255) ?? null,
    categorias: normalizeStringList(row.categorias, 'title'),
    categoria_outro: normalizeCasedText(row.categoria_outro, 'sentence'),
    tipologias_clientes: normalizeStringList(row.tipologias_clientes, 'title'),
    tipologia_cliente_outro: normalizeCasedText(row.tipologia_cliente_outro, 'sentence'),
    sugestoes_receitas: normalizeCasedText(row.sugestoes_receitas, 'sentence'),
    codigo_barras_ean: normalizeShortText(row.codigo_barras_ean),
    codigo_barras_dun: normalizeShortText(row.codigo_barras_dun),
    codigo_fiscal_ncm: normalizeShortText(row.codigo_fiscal_ncm),
    tipo_conservacao,
    tipo_conservacao_outro: normalizeCasedText(row.tipo_conservacao_outro, 'sentence'),
    validade_embalagem_fechada: normalizeCasedText(row.validade_embalagem_fechada, 'sentence')?.slice(
      0,
      255,
    ) ?? null,
    validade_apos_abertura:
      normalizeCasedText(row.validade_apos_abertura, 'sentence')?.slice(0, 255) ?? null,
    validade_apos_preparo: normalizeCasedText(row.validade_apos_preparo, 'sentence')?.slice(0, 255) ?? null,
    instrucoes_conservacao_produto: normalizeCasedText(row.instrucoes_conservacao_produto, 'sentence'),
    restricoes_produto: normalizeCasedText(row.restricoes_produto, 'sentence'),
    unidade_venda,
    unidade_venda_outro: normalizeCasedText(row.unidade_venda_outro, 'sentence'),
    peso_liquido_volume: normalizeShortText(row.peso_liquido_volume),
    peso_bruto: normalizeShortText(row.peso_bruto),
    qtd_unidades_por_caixa:
      normalizeCasedText(row.qtd_unidades_por_caixa, 'sentence')?.slice(0, 255) ?? null,
    instrucoes_conservacao_embalagem: normalizeCasedText(
      row.instrucoes_conservacao_embalagem,
      'sentence',
    ),
    restricoes_embalagem: normalizeCasedText(row.restricoes_embalagem, 'sentence'),
    possui_ingredientes: normalizeBoolean(row.possui_ingredientes),
    ingredientes: normalizeCasedText(row.ingredientes, 'sentence'),
    alergenos: normalizeCasedText(row.alergenos, 'sentence'),
    produto_pronto_uso,
    produto_pronto_uso_outro: normalizeCasedText(row.produto_pronto_uso_outro, 'sentence'),
    modo_preparo: normalizeCasedText(row.modo_preparo, 'sentence'),
    observacoes_uso: normalizeCasedText(row.observacoes_uso, 'sentence'),
    objecoes_argumentacoes: normalizeObjections(row.objecoes_argumentacoes),
    fotos_produto: normalizeUrlList(row.fotos_produto),
    videos_material: normalizeUrlList(row.videos_material),
    observacoes_imagens: normalizeCasedText(row.observacoes_imagens, 'sentence'),
    informacoes_tecnicas_complementares: normalizeCasedText(
      row.informacoes_tecnicas_complementares,
      'sentence',
    ),
    certificacoes_registros: normalizeCasedText(row.certificacoes_registros, 'sentence'),
    observacoes_comerciais: normalizeCasedText(row.observacoes_comerciais, 'sentence'),
    diferenciais_produto: normalizeCasedText(row.diferenciais_produto, 'sentence'),
    observacoes_gerais: normalizeCasedText(row.observacoes_gerais, 'sentence'),
  };
}

function toCreateData(row: NormalizedProductRecord): Prisma.produtosUncheckedCreateInput {
  const now = new Date();

  return {
    id: createUuidV7(),
    company_id: row.company_id,
    nome: row.nome,
    descricao_comercial: row.descricao_comercial,
    codigo_interno_sku: row.codigo_interno_sku,
    marca: row.marca,
    categorias: row.categorias,
    categoria_outro: row.categoria_outro,
    tipologias_clientes: row.tipologias_clientes,
    tipologia_cliente_outro: row.tipologia_cliente_outro,
    sugestoes_receitas: row.sugestoes_receitas,
    codigo_barras_ean: row.codigo_barras_ean,
    codigo_barras_dun: row.codigo_barras_dun,
    codigo_fiscal_ncm: row.codigo_fiscal_ncm,
    tipo_conservacao: row.tipo_conservacao,
    tipo_conservacao_outro: row.tipo_conservacao_outro,
    validade_embalagem_fechada: row.validade_embalagem_fechada,
    validade_apos_abertura: row.validade_apos_abertura,
    validade_apos_preparo: row.validade_apos_preparo,
    instrucoes_conservacao_produto: row.instrucoes_conservacao_produto,
    restricoes_produto: row.restricoes_produto,
    unidade_venda: row.unidade_venda,
    unidade_venda_outro: row.unidade_venda_outro,
    peso_liquido_volume: row.peso_liquido_volume,
    peso_bruto: row.peso_bruto,
    qtd_unidades_por_caixa: row.qtd_unidades_por_caixa,
    instrucoes_conservacao_embalagem: row.instrucoes_conservacao_embalagem,
    restricoes_embalagem: row.restricoes_embalagem,
    possui_ingredientes: row.possui_ingredientes,
    ingredientes: row.ingredientes,
    alergenos: row.alergenos,
    produto_pronto_uso: row.produto_pronto_uso,
    produto_pronto_uso_outro: row.produto_pronto_uso_outro,
    modo_preparo: row.modo_preparo,
    observacoes_uso: row.observacoes_uso,
    objecoes_argumentacoes: row.objecoes_argumentacoes as Prisma.InputJsonValue,
    fotos_produto: row.fotos_produto,
    videos_material: row.videos_material,
    observacoes_imagens: row.observacoes_imagens,
    informacoes_tecnicas_complementares: row.informacoes_tecnicas_complementares,
    certificacoes_registros: row.certificacoes_registros,
    observacoes_comerciais: row.observacoes_comerciais,
    diferenciais_produto: row.diferenciais_produto,
    observacoes_gerais: row.observacoes_gerais,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

function toUpdateData(row: NormalizedProductRecord): Prisma.produtosUncheckedUpdateInput {
  return {
    nome: row.nome,
    descricao_comercial: row.descricao_comercial,
    codigo_interno_sku: row.codigo_interno_sku,
    marca: row.marca,
    categorias: row.categorias,
    categoria_outro: row.categoria_outro,
    tipologias_clientes: row.tipologias_clientes,
    tipologia_cliente_outro: row.tipologia_cliente_outro,
    sugestoes_receitas: row.sugestoes_receitas,
    codigo_barras_ean: row.codigo_barras_ean,
    codigo_barras_dun: row.codigo_barras_dun,
    codigo_fiscal_ncm: row.codigo_fiscal_ncm,
    tipo_conservacao: row.tipo_conservacao,
    tipo_conservacao_outro: row.tipo_conservacao_outro,
    validade_embalagem_fechada: row.validade_embalagem_fechada,
    validade_apos_abertura: row.validade_apos_abertura,
    validade_apos_preparo: row.validade_apos_preparo,
    instrucoes_conservacao_produto: row.instrucoes_conservacao_produto,
    restricoes_produto: row.restricoes_produto,
    unidade_venda: row.unidade_venda,
    unidade_venda_outro: row.unidade_venda_outro,
    peso_liquido_volume: row.peso_liquido_volume,
    peso_bruto: row.peso_bruto,
    qtd_unidades_por_caixa: row.qtd_unidades_por_caixa,
    instrucoes_conservacao_embalagem: row.instrucoes_conservacao_embalagem,
    restricoes_embalagem: row.restricoes_embalagem,
    possui_ingredientes: row.possui_ingredientes,
    ingredientes: row.ingredientes,
    alergenos: row.alergenos,
    produto_pronto_uso: row.produto_pronto_uso,
    produto_pronto_uso_outro: row.produto_pronto_uso_outro,
    modo_preparo: row.modo_preparo,
    observacoes_uso: row.observacoes_uso,
    objecoes_argumentacoes: row.objecoes_argumentacoes as Prisma.InputJsonValue,
    fotos_produto: row.fotos_produto,
    videos_material: row.videos_material,
    observacoes_imagens: row.observacoes_imagens,
    informacoes_tecnicas_complementares: row.informacoes_tecnicas_complementares,
    certificacoes_registros: row.certificacoes_registros,
    observacoes_comerciais: row.observacoes_comerciais,
    diferenciais_produto: row.diferenciais_produto,
    observacoes_gerais: row.observacoes_gerais,
    updated_at: new Date(),
    deleted_at: null,
  };
}

async function resolveExistingProduct(row: NormalizedProductRecord) {
  if (row.codigo_interno_sku) {
    return prisma.produtos.findFirst({
      where: {
        company_id: row.company_id,
        codigo_interno_sku: row.codigo_interno_sku,
      },
      select: { id: true },
    });
  }

  return prisma.produtos.findFirst({
    where: {
      company_id: row.company_id,
      nome: row.nome,
      marca: row.marca,
    },
    select: { id: true },
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const content = await fs.readFile(options.inputJsonPath, 'utf8');
  const inputRows = parseInputRows(content);

  const company = await prisma.company.findFirst({
    where: { id: options.companyId },
    select: { id: true, name: true },
  });
  if (!company) {
    throw new Error(`Empresa nao encontrada: ${options.companyId}`);
  }

  const results: ImportResultRow[] = [];
  let created = 0;
  let updated = 0;
  let skippedInvalid = 0;

  for (const input of inputRows) {
    const normalized = normalizeInputRecord(input, options.companyId);
    if (!normalized) {
      skippedInvalid += 1;
      results.push({
        action: 'skipped_invalid',
        nome: normalizeText(input.nome) ?? '',
        marca: normalizeText(input.marca),
        codigo_interno_sku: normalizeText(input.codigo_interno_sku),
        source_rows: normalizeText(input.source_rows),
        reason: 'nome ausente',
        id: null,
      });
      continue;
    }

    const existing = await resolveExistingProduct(normalized);
    if (existing) {
      if (!options.dryRun) {
        await prisma.produtos.update({
          where: { id: existing.id },
          data: toUpdateData(normalized),
        });
      }

      updated += 1;
      results.push({
        action: 'updated',
        nome: normalized.nome,
        marca: normalized.marca,
        codigo_interno_sku: normalized.codigo_interno_sku,
        source_rows: normalized.source_rows,
        reason: null,
        id: existing.id,
      });
      continue;
    }

    if (!options.dryRun) {
      const createdRow = await prisma.produtos.create({
        data: toCreateData(normalized),
        select: { id: true },
      });
      created += 1;
      results.push({
        action: 'created',
        nome: normalized.nome,
        marca: normalized.marca,
        codigo_interno_sku: normalized.codigo_interno_sku,
        source_rows: normalized.source_rows,
        reason: null,
        id: createdRow.id,
      });
      continue;
    }

    created += 1;
    results.push({
      action: 'created',
      nome: normalized.nome,
      marca: normalized.marca,
      codigo_interno_sku: normalized.codigo_interno_sku,
      source_rows: normalized.source_rows,
      reason: null,
      id: 'dry-run-id',
    });
  }

  await writeResultCsv(options.outputCsvPath, results);

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        company: {
          id: company.id,
          name: company.name,
        },
        totals: {
          inputRows: inputRows.length,
          created,
          updated,
          skippedInvalid,
        },
        files: {
          inputJsonPath: options.inputJsonPath,
          outputCsvPath: options.outputCsvPath,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
