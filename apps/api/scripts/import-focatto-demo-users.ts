import { promises as fs } from 'node:fs';
import path from 'node:path';

import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

import { prisma } from '../src/lib/prisma.js';
import { normalizePhone } from '../src/utils/normalizers.js';
import { createUuidV7 } from '../src/utils/uuid.js';

type CliOptions = {
  companyId: string;
  inputCsvPath: string;
  outputCsvPath: string;
  removedCsvPath: string;
  dryRun: boolean;
};

type RawVendorRow = {
  linha_origem: string;
  total_mensagens: string;
  telefone: string;
  vendedor: string;
  supervisor: string;
  obs: string;
  status_validacao: string;
};

type CleanVendor = {
  line: string;
  name: string;
  phone: string;
  supervisorOrigin: string;
  totalMessages: number;
};

type RemovedVendor = {
  line: string;
  name: string;
  phone: string;
  supervisorOrigin: string;
  reason: string;
};

type ImportedUserResult = {
  action: 'created' | 'updated';
  source: string;
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string;
  company_id: string | null;
  manager_id: string | null;
  supervisor_id: string | null;
};

const DEFAULT_COMPANY_ID = '019c9123-681c-72ec-9d7b-74f74cad014a';
const DEFAULT_INPUT_CSV = path.resolve(
  process.cwd(),
  '..',
  '..',
  '_exports',
  'focatto_vendedores_dez_2025_organizado.csv',
);
const DEFAULT_OUTPUT_CSV = path.resolve(
  process.cwd(),
  '..',
  '..',
  '_exports',
  'focatto_demo_users_import_result.csv',
);
const DEFAULT_REMOVED_CSV = path.resolve(
  process.cwd(),
  '..',
  '..',
  '_exports',
  'focatto_demo_users_removed_rows.csv',
);
const DEFAULT_PASSWORD = 'focatto@321';

const TOP_USERS = {
  diretor: {
    role: UserRole.DIRETOR,
    full_name: 'Rafael',
    email: 'rafael@focatto.com.br',
    phone: '+55 51 9949-6365',
  },
  gerente: {
    role: UserRole.GERENTE_COMERCIAL,
    full_name: 'Douglas',
    email: 'douglas@focatto.com.br',
    phone: '+55 51 9180-7580',
  },
  supervisor: {
    role: UserRole.SUPERVISOR,
    full_name: 'Felipe',
    email: 'felipe@focatto.com.br',
    phone: '+55 51 8949-7714',
  },
} as const;

class CpfGenerator {
  private readonly used = new Set<string>();

  private current = 98000000000n;

  constructor(initialUsed: string[]) {
    for (const cpf of initialUsed) {
      this.used.add(cpf);
    }
  }

  next() {
    while (true) {
      const candidate = String(this.current);
      this.current += 1n;

      if (this.used.has(candidate)) {
        continue;
      }

      this.used.add(candidate);
      return candidate;
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    companyId: DEFAULT_COMPANY_ID,
    inputCsvPath: DEFAULT_INPUT_CSV,
    outputCsvPath: DEFAULT_OUTPUT_CSV,
    removedCsvPath: DEFAULT_REMOVED_CSV,
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
      options.inputCsvPath = path.resolve(process.cwd(), arg.slice('--input='.length).trim());
      continue;
    }

    if (arg.startsWith('--output=')) {
      options.outputCsvPath = path.resolve(process.cwd(), arg.slice('--output='.length).trim());
      continue;
    }

    if (arg.startsWith('--removed-output=')) {
      options.removedCsvPath = path.resolve(
        process.cwd(),
        arg.slice('--removed-output='.length).trim(),
      );
      continue;
    }
  }

  return options;
}

function csvEscape(value: string | null) {
  if (value === null) {
    return '';
  }

  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function parseCsvLine(line: string) {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      columns.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
}

function readCsvRows(text: string): RawVendorRow[] {
  const sanitized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = sanitized.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const header = parseCsvLine(lines[0]).map((value) => value.trim());
  const rows: RawVendorRow[] = [];

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    const rowObj = {} as Record<string, string>;
    for (let i = 0; i < header.length; i += 1) {
      rowObj[header[i]] = (cols[i] ?? '').trim();
    }

    rows.push({
      linha_origem: rowObj.linha_origem ?? '',
      total_mensagens: rowObj.total_mensagens ?? '0',
      telefone: rowObj.telefone ?? '',
      vendedor: rowObj.vendedor ?? '',
      supervisor: rowObj.supervisor ?? '',
      obs: rowObj.obs ?? '',
      status_validacao: rowObj.status_validacao ?? '',
    });
  }

  return rows;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function parseMessageCount(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return 0;
  }

  return Number.parseInt(digits, 10);
}

function buildVendorList(rawRows: RawVendorRow[], blockedPhones: Set<string>) {
  const removed: RemovedVendor[] = [];
  const cleanRows: CleanVendor[] = [];

  for (const row of rawRows) {
    const name = normalizeName(row.vendedor);
    const supervisor = normalizeName(row.supervisor);
    const phone = normalizePhone(row.telefone);
    const reasons: string[] = [];

    if (!name) {
      reasons.push('SEM_NOME');
    }

    if (!supervisor) {
      reasons.push('SEM_SUPERVISOR_ORIGEM');
    }

    if (!phone) {
      reasons.push('SEM_TELEFONE');
    }

    if (name.toUpperCase().startsWith('DISPONIVEL')) {
      reasons.push('NOME_PLACEHOLDER');
    }

    if (name.includes('/')) {
      reasons.push('NOME_MULTIPLO');
    }

    if (blockedPhones.has(phone)) {
      reasons.push('TELEFONE_RESERVADO_HIERARQUIA');
    }

    if (reasons.length > 0) {
      removed.push({
        line: row.linha_origem,
        name,
        phone,
        supervisorOrigin: supervisor,
        reason: reasons.join(';'),
      });
      continue;
    }

    cleanRows.push({
      line: row.linha_origem,
      name,
      phone,
      supervisorOrigin: supervisor,
      totalMessages: parseMessageCount(row.total_mensagens),
    });
  }

  const score = (vendor: CleanVendor) => vendor.totalMessages * 100 + vendor.name.length;

  const byName = new Map<string, CleanVendor>();
  for (const vendor of cleanRows) {
    const key = vendor.name.toUpperCase();
    const current = byName.get(key);
    if (!current || score(vendor) > score(current)) {
      if (current) {
        removed.push({
          line: current.line,
          name: current.name,
          phone: current.phone,
          supervisorOrigin: current.supervisorOrigin,
          reason: 'DUPLICADO_NOME',
        });
      }
      byName.set(key, vendor);
      continue;
    }

    removed.push({
      line: vendor.line,
      name: vendor.name,
      phone: vendor.phone,
      supervisorOrigin: vendor.supervisorOrigin,
      reason: 'DUPLICADO_NOME',
    });
  }

  const byPhone = new Map<string, CleanVendor>();
  for (const vendor of byName.values()) {
    const current = byPhone.get(vendor.phone);
    if (!current || score(vendor) > score(current)) {
      if (current) {
        removed.push({
          line: current.line,
          name: current.name,
          phone: current.phone,
          supervisorOrigin: current.supervisorOrigin,
          reason: 'DUPLICADO_TELEFONE',
        });
      }
      byPhone.set(vendor.phone, vendor);
      continue;
    }

    removed.push({
      line: vendor.line,
      name: vendor.name,
      phone: vendor.phone,
      supervisorOrigin: vendor.supervisorOrigin,
      reason: 'DUPLICADO_TELEFONE',
    });
  }

  const vendors = Array.from(byPhone.values()).sort((a, b) => a.name.localeCompare(b.name));
  removed.sort((a, b) => a.name.localeCompare(b.name) || a.line.localeCompare(b.line));

  return { vendors, removed };
}

async function ensureCompanyExists(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, deleted_at: true },
  });

  if (!company) {
    throw new Error(`Empresa nao encontrada para id=${companyId}`);
  }

  if (company.deleted_at) {
    throw new Error(`Empresa ${companyId} esta soft deleted.`);
  }

  return company;
}

async function writeResultCsv(filePath: string, users: ImportedUserResult[]) {
  const header = [
    'action',
    'source',
    'id',
    'role',
    'full_name',
    'email',
    'phone',
    'company_id',
    'manager_id',
    'supervisor_id',
  ];

  const lines = [header.join(',')];
  for (const user of users) {
    lines.push(
      [
        csvEscape(user.action),
        csvEscape(user.source),
        csvEscape(user.id),
        csvEscape(user.role),
        csvEscape(user.full_name),
        csvEscape(user.email),
        csvEscape(user.phone),
        csvEscape(user.company_id),
        csvEscape(user.manager_id),
        csvEscape(user.supervisor_id),
      ].join(','),
    );
  }

  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function writeRemovedCsv(filePath: string, removedRows: RemovedVendor[]) {
  const header = ['line', 'name', 'phone', 'supervisor_origin', 'reason'];
  const lines = [header.join(',')];

  for (const row of removedRows) {
    lines.push(
      [
        csvEscape(row.line),
        csvEscape(row.name),
        csvEscape(row.phone),
        csvEscape(row.supervisorOrigin),
        csvEscape(row.reason),
      ].join(','),
    );
  }

  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

async function getOrCreateUserByPhone(input: {
  companyId: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  phone: string;
  managerId: string | null;
  supervisorId: string | null;
  passwordHash: string | null;
  cpfGenerator: CpfGenerator;
  dryRun: boolean;
}): Promise<ImportedUserResult> {
  const phone = normalizePhone(input.phone);
  const existingByPhone = await prisma.user.findUnique({
    where: {
      company_id_phone: {
        company_id: input.companyId,
        phone,
      },
    },
    select: {
      id: true,
      cpf: true,
      role: true,
      full_name: true,
      email: true,
      phone: true,
      company_id: true,
      manager_id: true,
      supervisor_id: true,
    },
  });

  if (existingByPhone) {
    if (!input.dryRun) {
      await prisma.user.update({
        where: {
          id: existingByPhone.id,
        },
        data: {
          role: input.role,
          full_name: input.fullName,
          email: input.email,
          phone,
          company_id: input.companyId,
          manager_id: input.managerId,
          supervisor_id: input.supervisorId,
          passwordHash: input.passwordHash,
          is_active: true,
          deleted_at: null,
        },
      });
    }

    return {
      action: 'updated',
      source: '',
      id: existingByPhone.id,
      role: input.role,
      full_name: input.fullName,
      email: input.email,
      phone,
      company_id: input.companyId,
      manager_id: input.managerId,
      supervisor_id: input.supervisorId,
    };
  }

  if (input.dryRun) {
    return {
      action: 'created',
      source: '',
      id: 'dry-run-id',
      role: input.role,
      full_name: input.fullName,
      email: input.email,
      phone,
      company_id: input.companyId,
      manager_id: input.managerId,
      supervisor_id: input.supervisorId,
    };
  }

  const created = await prisma.user.create({
    data: {
      id: createUuidV7(),
      role: input.role,
      full_name: input.fullName,
      cpf: input.cpfGenerator.next(),
      email: input.email,
      phone,
      company_id: input.companyId,
      manager_id: input.managerId,
      supervisor_id: input.supervisorId,
      passwordHash: input.passwordHash,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      role: true,
      full_name: true,
      email: true,
      phone: true,
      company_id: true,
      manager_id: true,
      supervisor_id: true,
    },
  });

  return {
    action: 'created',
    source: '',
    id: created.id,
    role: created.role,
    full_name: created.full_name,
    email: created.email,
    phone: created.phone,
    company_id: created.company_id,
    manager_id: created.manager_id,
    supervisor_id: created.supervisor_id,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const csvText = await fs.readFile(options.inputCsvPath, 'utf8');
  const parsedRows = readCsvRows(csvText);
  const company = await ensureCompanyExists(options.companyId);

  const reservedPhones = new Set(
    Object.values(TOP_USERS).map((user) => normalizePhone(user.phone)).filter((phone) => phone.length > 0),
  );

  const { vendors, removed } = buildVendorList(parsedRows, reservedPhones);
  const existingCpfs = await prisma.user.findMany({
    select: { cpf: true },
  });
  const cpfGenerator = new CpfGenerator(existingCpfs.map((entry) => entry.cpf));
  const passwordHash = options.dryRun ? null : await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const importResults: ImportedUserResult[] = [];

  const diretor = await getOrCreateUserByPhone({
    companyId: options.companyId,
    role: TOP_USERS.diretor.role,
    fullName: TOP_USERS.diretor.full_name,
    email: TOP_USERS.diretor.email,
    phone: TOP_USERS.diretor.phone,
    managerId: null,
    supervisorId: null,
    passwordHash,
    cpfGenerator,
    dryRun: options.dryRun,
  });
  diretor.source = 'top_user_diretor';
  importResults.push(diretor);

  const gerente = await getOrCreateUserByPhone({
    companyId: options.companyId,
    role: TOP_USERS.gerente.role,
    fullName: TOP_USERS.gerente.full_name,
    email: TOP_USERS.gerente.email,
    phone: TOP_USERS.gerente.phone,
    managerId: null,
    supervisorId: null,
    passwordHash,
    cpfGenerator,
    dryRun: options.dryRun,
  });
  gerente.source = 'top_user_gerente';
  importResults.push(gerente);

  const supervisor = await getOrCreateUserByPhone({
    companyId: options.companyId,
    role: TOP_USERS.supervisor.role,
    fullName: TOP_USERS.supervisor.full_name,
    email: TOP_USERS.supervisor.email,
    phone: TOP_USERS.supervisor.phone,
    managerId: gerente.id === 'dry-run-id' ? null : gerente.id,
    supervisorId: null,
    passwordHash,
    cpfGenerator,
    dryRun: options.dryRun,
  });
  supervisor.source = 'top_user_supervisor';
  importResults.push(supervisor);

  for (const vendor of vendors) {
    const result = await getOrCreateUserByPhone({
      companyId: options.companyId,
      role: UserRole.VENDEDOR,
      fullName: vendor.name,
      email: null,
      phone: vendor.phone,
      managerId: null,
      supervisorId: supervisor.id === 'dry-run-id' ? null : supervisor.id,
      passwordHash: null,
      cpfGenerator,
      dryRun: options.dryRun,
    });

    result.source = `vendor_line_${vendor.line}`;
    importResults.push(result);
  }

  await writeResultCsv(options.outputCsvPath, importResults);
  await writeRemovedCsv(options.removedCsvPath, removed);

  const createdCount = importResults.filter((item) => item.action === 'created').length;
  const updatedCount = importResults.filter((item) => item.action === 'updated').length;
  const vendorsCount = importResults.filter((item) => item.role === UserRole.VENDEDOR).length;

  console.log('Importacao de usuarios demo finalizada.');
  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        company: {
          id: company.id,
          name: company.name,
        },
        totals: {
          parsedRows: parsedRows.length,
          removedRows: removed.length,
          importedUsers: importResults.length,
          created: createdCount,
          updated: updatedCount,
          vendedores: vendorsCount,
        },
        outputFiles: {
          importedUsersCsv: options.outputCsvPath,
          removedRowsCsv: options.removedCsvPath,
        },
        hierarchy: {
          diretor: { id: diretor.id, name: diretor.full_name, phone: diretor.phone },
          gerente: { id: gerente.id, name: gerente.full_name, phone: gerente.phone },
          supervisor: { id: supervisor.id, name: supervisor.full_name, phone: supervisor.phone },
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
