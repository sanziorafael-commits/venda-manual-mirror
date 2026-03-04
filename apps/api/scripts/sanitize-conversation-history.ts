import { promises as fs } from 'node:fs';
import path from 'node:path';

import { prisma } from '../src/lib/prisma.js';

type Mode = 'sync-json' | 'format-db';

type CliOptions = {
  mode: Mode;
  companyId: string | null;
  flowName: string | null;
  inputJsonPath: string | null;
  dryRun: boolean;
};

type InputRow = {
  execution_id?: unknown;
  mensagem?: unknown;
  resposta?: unknown;
};

type ParsedInputRow = {
  execution_id: string;
  mensagem: string | null;
  resposta: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    mode: 'format-db',
    companyId: null,
    flowName: null,
    inputJsonPath: null,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--mode=')) {
      const value = arg.slice('--mode='.length).trim();
      if (value === 'sync-json' || value === 'format-db') {
        options.mode = value;
      } else {
        throw new Error(`Modo invalido: ${value}. Use sync-json ou format-db.`);
      }
      continue;
    }

    if (arg.startsWith('--company-id=')) {
      const value = arg.slice('--company-id='.length).trim();
      options.companyId = value.length > 0 ? value : null;
      continue;
    }

    if (arg.startsWith('--flow-name=')) {
      const value = arg.slice('--flow-name='.length).trim();
      options.flowName = value.length > 0 ? value : null;
      continue;
    }

    if (arg.startsWith('--input=')) {
      const value = arg.slice('--input='.length).trim();
      options.inputJsonPath = value.length > 0 ? path.resolve(process.cwd(), value) : null;
      continue;
    }
  }

  if (options.mode === 'sync-json' && !options.inputJsonPath) {
    throw new Error('No modo sync-json, informe --input=<arquivo.json>.');
  }

  if (options.mode === 'format-db' && !options.companyId && !options.flowName) {
    throw new Error('No modo format-db, informe --company-id ou --flow-name para limitar o escopo.');
  }

  return options;
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized.length > 0 ? normalized : null;
}

function parseRows(raw: string): ParsedInputRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`JSON invalido: ${String(error)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Formato invalido: esperado um array de objetos.');
  }

  const rows: ParsedInputRow[] = [];
  for (let index = 0; index < parsed.length; index += 1) {
    const row = parsed[index] as InputRow;
    const executionId = normalizeNullableText(row.execution_id)?.trim();

    if (!executionId) {
      throw new Error(`Linha ${index + 1}: execution_id obrigatorio.`);
    }

    rows.push({
      execution_id: executionId,
      mensagem: normalizeNullableText(row.mensagem),
      resposta: normalizeNullableText(row.resposta),
    });
  }

  return rows;
}

function formatConversationMessageText(value: string) {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (normalized.includes('\n')) {
    return normalized;
  }

  return normalized
    .replace(/\s+(?=\d{1,2}[.)]\s)/g, '\n')
    .replace(/([.:;!?])\s+-\s+/g, '$1\n- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function runSyncJson(options: CliOptions) {
  if (!options.inputJsonPath) {
    throw new Error('inputJsonPath ausente.');
  }

  const jsonText = await fs.readFile(options.inputJsonPath, 'utf8');
  const rows = parseRows(jsonText);
  const uniqueExecutionIds = Array.from(new Set(rows.map((row) => row.execution_id)));

  let updated = 0;
  let notFound = 0;
  let inputRowsWithRespostaNewline = 0;

  for (const row of rows) {
    if (typeof row.resposta === 'string' && row.resposta.includes('\n')) {
      inputRowsWithRespostaNewline += 1;
    }

    if (options.dryRun) {
      continue;
    }

    const result = await prisma.historico_conversas.updateMany({
      where: {
        execution_id: row.execution_id,
        ...(options.flowName ? { flow_name: options.flowName } : {}),
        ...(options.companyId ? { company_id: options.companyId } : {}),
      },
      data: {
        mensagem: row.mensagem ?? undefined,
        resposta: row.resposta ?? undefined,
      },
    });

    if (result.count > 0) {
      updated += result.count;
    } else {
      notFound += 1;
    }
  }

  const persistedRows = await prisma.historico_conversas.findMany({
    where: {
      execution_id: { in: uniqueExecutionIds },
      ...(options.flowName ? { flow_name: options.flowName } : {}),
      ...(options.companyId ? { company_id: options.companyId } : {}),
    },
    select: {
      execution_id: true,
      resposta: true,
    },
  });

  const dbRowsWithRespostaNewline = persistedRows.filter(
    (row) => typeof row.resposta === 'string' && row.resposta.includes('\n'),
  ).length;

  console.log(
    JSON.stringify(
      {
        mode: options.mode,
        dryRun: options.dryRun,
        filters: {
          companyId: options.companyId,
          flowName: options.flowName,
        },
        inputJsonPath: options.inputJsonPath,
        totals: {
          inputRows: rows.length,
          uniqueExecutionIds: uniqueExecutionIds.length,
          inputRowsWithRespostaNewline,
          updated,
          notFound,
          dbRowsFoundByExecutionIds: persistedRows.length,
          dbRowsWithRespostaNewline,
        },
      },
      null,
      2,
    ),
  );
}

async function runFormatDb(options: CliOptions) {
  const rows = await prisma.historico_conversas.findMany({
    where: {
      resposta: { not: null },
      ...(options.companyId ? { company_id: options.companyId } : {}),
      ...(options.flowName ? { flow_name: options.flowName } : {}),
    },
    select: {
      id: true,
      resposta: true,
    },
  });

  const beforeWithRespostaNewline = rows.filter(
    (row) => typeof row.resposta === 'string' && row.resposta.includes('\n'),
  ).length;

  let changed = 0;
  for (const row of rows) {
    if (typeof row.resposta !== 'string') {
      continue;
    }

    const formatted = formatConversationMessageText(row.resposta);
    if (formatted === row.resposta) {
      continue;
    }

    changed += 1;
    if (options.dryRun) {
      continue;
    }

    await prisma.historico_conversas.update({
      where: { id: row.id },
      data: { resposta: formatted },
    });
  }

  const persistedRows = await prisma.historico_conversas.findMany({
    where: {
      resposta: { not: null },
      ...(options.companyId ? { company_id: options.companyId } : {}),
      ...(options.flowName ? { flow_name: options.flowName } : {}),
    },
    select: {
      id: true,
      resposta: true,
    },
  });

  const afterWithRespostaNewline = persistedRows.filter(
    (row) => typeof row.resposta === 'string' && row.resposta.includes('\n'),
  ).length;

  console.log(
    JSON.stringify(
      {
        mode: options.mode,
        dryRun: options.dryRun,
        filters: {
          companyId: options.companyId,
          flowName: options.flowName,
        },
        totals: {
          scanned: rows.length,
          changed,
          beforeWithRespostaNewline,
          afterWithRespostaNewline,
        },
      },
      null,
      2,
    ),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === 'sync-json') {
    await runSyncJson(options);
    return;
  }

  await runFormatDb(options);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
