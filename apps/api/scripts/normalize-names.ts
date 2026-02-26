import { prisma } from '../src/lib/prisma.js';

type CliOptions = {
  companyId: string;
  dryRun: boolean;
};

const DEFAULT_COMPANY_ID = '019c9123-681c-72ec-9d7b-74f74cad014a';
const LOWERCASE_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    companyId: DEFAULT_COMPANY_ID,
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
  }

  return options;
}

function normalizeName(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return null;
  }

  const lowered = compact.toLocaleLowerCase('pt-BR');
  const words = lowered.split(' ');

  return words
    .map((word, index) => {
      if (index > 0 && LOWERCASE_PARTICLES.has(word)) {
        return word;
      }

      return word.replace(/(^|['-])(\p{L})/gu, (_, prefix: string, char: string) => {
        return `${prefix}${char.toLocaleUpperCase('pt-BR')}`;
      });
    })
    .join(' ');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const users = await prisma.user.findMany({
    where: {
      company_id: options.companyId,
      deleted_at: null,
    },
    select: {
      id: true,
      full_name: true,
    },
  });

  let usersChanged = 0;
  for (const user of users) {
    const normalized = normalizeName(user.full_name);
    if (!normalized || normalized === user.full_name) {
      continue;
    }

    usersChanged += 1;
    if (options.dryRun) {
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { full_name: normalized },
    });
  }

  const historyRows = await prisma.historico_conversas.findMany({
    where: {
      company_id: options.companyId,
    },
    select: {
      id: true,
      vendedor_nome: true,
      supervisor: true,
    },
  });

  let historyRowsChanged = 0;
  let vendorNameChanged = 0;
  let supervisorChanged = 0;

  for (const row of historyRows) {
    const normalizedVendorName = normalizeName(row.vendedor_nome);
    const normalizedSupervisor = normalizeName(row.supervisor);

    const shouldUpdateVendorName =
      normalizedVendorName !== null && normalizedVendorName !== row.vendedor_nome;
    const shouldUpdateSupervisor =
      normalizedSupervisor !== null && normalizedSupervisor !== row.supervisor;

    if (!shouldUpdateVendorName && !shouldUpdateSupervisor) {
      continue;
    }

    historyRowsChanged += 1;
    if (shouldUpdateVendorName) {
      vendorNameChanged += 1;
    }
    if (shouldUpdateSupervisor) {
      supervisorChanged += 1;
    }

    if (options.dryRun) {
      continue;
    }

    await prisma.historico_conversas.update({
      where: { id: row.id },
      data: {
        vendedor_nome: shouldUpdateVendorName ? normalizedVendorName : undefined,
        supervisor: shouldUpdateSupervisor ? normalizedSupervisor : undefined,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        companyId: options.companyId,
        totals: {
          usersScanned: users.length,
          usersChanged,
          historyRowsScanned: historyRows.length,
          historyRowsChanged,
          vendorNameChanged,
          supervisorChanged,
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
