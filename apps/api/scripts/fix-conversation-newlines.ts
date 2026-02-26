import { promises as fs } from 'node:fs';
import path from 'node:path';

import { prisma } from '../src/lib/prisma.js';

type CliOptions = {
  flowName: string;
  inputJsonPath: string;
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

const DEFAULT_FLOW_NAME = 'focatto_dados_totais_import';
const DEFAULT_INPUT_JSON = path.resolve(
  process.cwd(),
  '..',
  '..',
  'exports',
  'focatto_conversas_dados_totais_import_ok_preserve_newlines.json',
);

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    flowName: DEFAULT_FLOW_NAME,
    inputJsonPath: DEFAULT_INPUT_JSON,
    dryRun: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--flow-name=')) {
      options.flowName = arg.slice('--flow-name='.length).trim();
      continue;
    }

    if (arg.startsWith('--input=')) {
      options.inputJsonPath = path.resolve(process.cwd(), arg.slice('--input='.length).trim());
    }
  }

  return options;
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
    const executionId = normalizeNullableText(row.execution_id);

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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const jsonText = await fs.readFile(options.inputJsonPath, 'utf8');
  const rows = parseRows(jsonText);

  const uniqueExecutionIds = new Set<string>();
  for (const row of rows) {
    uniqueExecutionIds.add(row.execution_id);
  }

  let updated = 0;
  let notFound = 0;
  let rowsWithNewline = 0;

  for (const row of rows) {
    if (typeof row.resposta === 'string' && row.resposta.includes('\n')) {
      rowsWithNewline += 1;
    }

    if (options.dryRun) {
      continue;
    }

    const result = await prisma.historico_conversas.updateMany({
      where: {
        flow_name: options.flowName,
        execution_id: row.execution_id,
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
      flow_name: options.flowName,
      execution_id: {
        in: Array.from(uniqueExecutionIds),
      },
    },
    select: {
      execution_id: true,
      resposta: true,
    },
  });

  const persistedWithNewline = persistedRows.filter(
    (row) => typeof row.resposta === 'string' && row.resposta.includes('\n'),
  ).length;

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        flowName: options.flowName,
        inputJsonPath: options.inputJsonPath,
        totals: {
          inputRows: rows.length,
          uniqueExecutionIds: uniqueExecutionIds.size,
          inputRowsWithNewline: rowsWithNewline,
          updated,
          notFound,
          dbRowsFoundByExecutionIds: persistedRows.length,
          dbRowsWithNewline: persistedWithNewline,
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
