import { promises as fs } from 'node:fs';
import path from 'node:path';

import { UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

import { prisma } from '../src/lib/prisma.js';
import { normalizeEmail, normalizePhone } from '../src/utils/normalizers.js';
import { createUuidV7 } from '../src/utils/uuid.js';

type CliOptions = {
  companyId: string;
  managerEmail: string;
  inputCsvPath: string;
  outputCsvPath: string;
  supervisorPassword: string;
  dryRun: boolean;
};

type InputType = 'SUPERVISOR' | 'VENDEDOR';

type InputRow = {
  line: string;
  name: string;
  email: string;
  phoneRaw: string;
  phone: string;
  supervisorLabel: string;
  type: InputType;
};

type UserLite = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  role: UserRole;
  cpf: string;
};

type ResolveMethod =
  | 'email_exact'
  | 'name_exact'
  | 'name_tokens'
  | 'name_single_token'
  | 'phone_direct'
  | 'phone_legacy'
  | 'none';

type ResolveResult =
  | { method: Exclude<ResolveMethod, 'none'>; user: UserLite }
  | { method: 'none' };

type ResultRow = {
  line: string;
  type: InputType;
  name: string;
  action: 'updated' | 'created' | 'skipped';
  user_id: string | null;
  role: UserRole | null;
  supervisor_name: string | null;
  supervisor_id: string | null;
  phone: string | null;
  email: string | null;
  reason: string | null;
  resolution_method: ResolveMethod | null;
};

const DEFAULT_COMPANY_ID = '019c9123-681c-72ec-9d7b-74f74cad014a';
const DEFAULT_MANAGER_EMAIL = 'douglas@focatto.com.br';
const DEFAULT_SUPERVISOR_PASSWORD = 'focatto@321';
const DEFAULT_INPUT_CSV = path.resolve(
  process.cwd(),
  '..',
  '..',
  'exports',
  'focatto_usuarios_supervisores_2026_02_28.csv',
);
const DEFAULT_OUTPUT_CSV = path.resolve(
  process.cwd(),
  '..',
  '..',
  'exports',
  'focatto_usuarios_supervisores_sync_result.csv',
);

class CpfGenerator {
  private readonly used = new Set<string>();

  private current = 99000000000n;

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
    managerEmail: DEFAULT_MANAGER_EMAIL,
    inputCsvPath: DEFAULT_INPUT_CSV,
    outputCsvPath: DEFAULT_OUTPUT_CSV,
    supervisorPassword: DEFAULT_SUPERVISOR_PASSWORD,
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

    if (arg.startsWith('--manager-email=')) {
      options.managerEmail = arg.slice('--manager-email='.length).trim();
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

    if (arg.startsWith('--supervisor-password=')) {
      options.supervisorPassword = arg.slice('--supervisor-password='.length).trim();
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

function normalizeText(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

function normalizeNameForCompare(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeName(value: string) {
  return normalizeNameForCompare(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function isPlaceholderName(value: string) {
  const normalized = normalizeNameForCompare(value);
  return normalized === 'disponivel' || normalized === 'disponivel a';
}

function buildLegacyPhone(phone: string) {
  if (phone.length === 13 && phone.startsWith('55')) {
    const local = phone.slice(4);
    if (local.length === 9 && local.startsWith('9')) {
      return `${phone.slice(0, 4)}${local.slice(1)}`;
    }
  }

  return phone;
}

function readInputRows(csvText: string): InputRow[] {
  const normalizedText = csvText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const header = parseCsvLine(lines[0]).map((col) => col.trim());
  const indexMap = new Map(header.map((key, index) => [key, index]));

  const output: InputRow[] = [];
  for (const line of lines.slice(1)) {
    const columns = parseCsvLine(line);
    const lineValue = normalizeText(columns[indexMap.get('linha_origem') ?? -1]);
    const name = normalizeText(columns[indexMap.get('nome') ?? -1]);
    const email = normalizeText(columns[indexMap.get('email') ?? -1]).toLowerCase();
    const phoneRaw = normalizeText(columns[indexMap.get('telefone') ?? -1]);
    const supervisorLabel = normalizeText(columns[indexMap.get('supervisor_coluna') ?? -1]);
    const typeRaw = normalizeText(columns[indexMap.get('tipo_registro') ?? -1]).toUpperCase();
    const type: InputType = typeRaw === 'SUPERVISOR' ? 'SUPERVISOR' : 'VENDEDOR';
    const phone = normalizePhone(phoneRaw);

    if (!name || !phone) {
      continue;
    }

    output.push({
      line: lineValue,
      name,
      email,
      phoneRaw,
      phone,
      supervisorLabel,
      type,
    });
  }

  return output;
}

function upsertMapList<T>(map: Map<string, T[]>, key: string, value: T) {
  const current = map.get(key) ?? [];
  current.push(value);
  map.set(key, current);
}

function findNameTokenCandidates(users: UserLite[], rowName: string) {
  const rowTokens = tokenizeName(rowName);
  if (rowTokens.length === 0) {
    return [];
  }

  if (rowTokens.length === 1) {
    const token = rowTokens[0];
    return users.filter((user) => {
      const userName = normalizeNameForCompare(user.full_name);
      const firstToken = userName.split(' ')[0] ?? '';
      return firstToken === token || userName.includes(` ${token} `) || userName.endsWith(` ${token}`);
    });
  }

  return users.filter((user) => {
    const userName = normalizeNameForCompare(user.full_name);
    const hits = rowTokens.filter((token) => userName.includes(token)).length;
    return hits >= Math.min(2, rowTokens.length);
  });
}

function isNameCompatibleForPhone(rowName: string, userName: string) {
  const rowTokens = tokenizeName(rowName);
  const userNameNormalized = normalizeNameForCompare(userName);

  if (normalizeNameForCompare(rowName) === userNameNormalized) {
    return true;
  }

  if (rowTokens.length === 0) {
    return false;
  }

  const hits = rowTokens.filter((token) => userNameNormalized.includes(token)).length;
  if (rowTokens.length === 1) {
    return hits >= 1;
  }

  return hits >= 1;
}

function resolveExistingUser(input: {
  row: InputRow;
  usersByEmail: Map<string, UserLite[]>;
  usersByPhone: Map<string, UserLite[]>;
  usersByNormName: Map<string, UserLite[]>;
  usersPool: UserLite[];
  usedUserIds: Set<string>;
  duplicatedPhones: Set<string>;
}): ResolveResult {
  const availableUsers = input.usersPool.filter((user) => !input.usedUserIds.has(user.id));
  const email = input.row.email;

  if (email) {
    const emailCandidates = (input.usersByEmail.get(email) ?? []).filter(
      (user) => !input.usedUserIds.has(user.id),
    );
    if (emailCandidates.length === 1) {
      return { method: 'email_exact', user: emailCandidates[0] };
    }
  }

  const normName = normalizeNameForCompare(input.row.name);
  const nameExactCandidates = (input.usersByNormName.get(normName) ?? []).filter(
    (user) => !input.usedUserIds.has(user.id),
  );
  if (nameExactCandidates.length === 1) {
    return { method: 'name_exact', user: nameExactCandidates[0] };
  }

  const tokenCandidates = findNameTokenCandidates(availableUsers, input.row.name);
  if (tokenCandidates.length === 1) {
    const rowTokens = tokenizeName(input.row.name);
    return {
      method: rowTokens.length <= 1 ? 'name_single_token' : 'name_tokens',
      user: tokenCandidates[0],
    };
  }

  if (!input.duplicatedPhones.has(input.row.phone)) {
    const directPhoneCandidates = (input.usersByPhone.get(input.row.phone) ?? []).filter(
      (user) => !input.usedUserIds.has(user.id),
    );
    if (
      directPhoneCandidates.length === 1 &&
      isNameCompatibleForPhone(input.row.name, directPhoneCandidates[0].full_name)
    ) {
      return { method: 'phone_direct', user: directPhoneCandidates[0] };
    }

    const legacyPhone = buildLegacyPhone(input.row.phone);
    const legacyPhoneCandidates = (input.usersByPhone.get(legacyPhone) ?? []).filter(
      (user) => !input.usedUserIds.has(user.id),
    );
    if (legacyPhoneCandidates.length === 1) {
      const candidate = legacyPhoneCandidates[0];
      if (
        isNameCompatibleForPhone(input.row.name, candidate.full_name) ||
        input.row.type === 'SUPERVISOR'
      ) {
        return { method: 'phone_legacy', user: candidate };
      }
    }
  }

  return { method: 'none' };
}

async function writeResultCsv(outputPath: string, rows: ResultRow[]) {
  const header = [
    'line',
    'type',
    'name',
    'action',
    'user_id',
    'role',
    'supervisor_name',
    'supervisor_id',
    'phone',
    'email',
    'reason',
    'resolution_method',
  ];
  const csvRows = [
    header.join(','),
    ...rows.map((row) =>
      [
        row.line,
        row.type,
        row.name,
        row.action,
        row.user_id,
        row.role,
        row.supervisor_name,
        row.supervisor_id,
        row.phone,
        row.email,
        row.reason,
        row.resolution_method,
      ]
        .map((value) => csvEscape(value ?? null))
        .join(','),
    ),
  ];

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${csvRows.join('\n')}\n`, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const csvText = await fs.readFile(options.inputCsvPath, 'utf8');
  const inputRows = readInputRows(csvText);
  if (inputRows.length === 0) {
    throw new Error('Nenhuma linha valida encontrada no CSV de entrada');
  }

  const manager = await prisma.user.findFirst({
    where: {
      company_id: options.companyId,
      role: UserRole.GERENTE_COMERCIAL,
      email: normalizeEmail(options.managerEmail),
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
    },
  });
  if (!manager) {
    throw new Error(`Gerente comercial nao encontrado para email ${options.managerEmail}`);
  }

  const users = await prisma.user.findMany({
    where: {
      company_id: options.companyId,
      deleted_at: null,
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone: true,
      role: true,
      cpf: true,
    },
  });

  const allCpfs = await prisma.user.findMany({
    select: {
      cpf: true,
    },
  });
  const cpfGenerator = new CpfGenerator(allCpfs.map((item) => item.cpf));

  const usersByEmail = new Map<string, UserLite[]>();
  const usersByPhone = new Map<string, UserLite[]>();
  const usersByNormName = new Map<string, UserLite[]>();
  for (const user of users) {
    if (user.email) {
      upsertMapList(usersByEmail, normalizeEmail(user.email), user);
    }
    upsertMapList(usersByPhone, normalizePhone(user.phone), user);
    upsertMapList(usersByNormName, normalizeNameForCompare(user.full_name), user);
  }

  const duplicatedPhones = new Set<string>();
  const duplicatedEmails = new Set<string>();
  const phoneCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();
  for (const row of inputRows) {
    phoneCounts.set(row.phone, (phoneCounts.get(row.phone) ?? 0) + 1);
    if (row.email) {
      emailCounts.set(row.email, (emailCounts.get(row.email) ?? 0) + 1);
    }
  }
  for (const [phone, count] of phoneCounts.entries()) {
    if (count > 1) {
      duplicatedPhones.add(phone);
    }
  }
  for (const [email, count] of emailCounts.entries()) {
    if (count > 1) {
      duplicatedEmails.add(email);
    }
  }

  const usedUserIds = new Set<string>();
  const supervisorRows = inputRows.filter((row) => row.type === 'SUPERVISOR');
  const vendorRows = inputRows.filter((row) => row.type === 'VENDEDOR');
  const resultRows: ResultRow[] = [];
  const supervisorIdByNormName = new Map<string, string>();
  const hashedSupervisorPassword = await bcrypt.hash(options.supervisorPassword, 10);

  for (const row of supervisorRows) {
    const resolved = resolveExistingUser({
      row,
      usersByEmail,
      usersByPhone,
      usersByNormName,
      usersPool: users,
      usedUserIds,
      duplicatedPhones,
    });

    const finalEmail = row.email || null;
    if (resolved.method !== 'none') {
      usedUserIds.add(resolved.user.id);
      supervisorIdByNormName.set(normalizeNameForCompare(row.name), resolved.user.id);

      if (!options.dryRun) {
        await prisma.user.update({
          where: { id: resolved.user.id },
          data: {
            role: UserRole.SUPERVISOR,
            full_name: row.name,
            email: finalEmail,
            phone: row.phone,
            manager_id: manager.id,
            supervisor_id: null,
            passwordHash: hashedSupervisorPassword,
            is_active: true,
            deleted_at: null,
          },
        });
      }

      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'updated',
        user_id: resolved.user.id,
        role: UserRole.SUPERVISOR,
        supervisor_name: null,
        supervisor_id: null,
        phone: row.phone,
        email: finalEmail,
        reason: null,
        resolution_method: resolved.method,
      });
      continue;
    }

    if (duplicatedPhones.has(row.phone)) {
      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'skipped',
        user_id: null,
        role: null,
        supervisor_name: null,
        supervisor_id: null,
        phone: row.phone,
        email: finalEmail,
        reason: 'telefone_duplicado_na_planilha',
        resolution_method: resolved.method,
      });
      continue;
    }

    if (usersByPhone.has(row.phone)) {
      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'skipped',
        user_id: null,
        role: null,
        supervisor_name: null,
        supervisor_id: null,
        phone: row.phone,
        email: finalEmail,
        reason: 'telefone_ja_usado_por_outro_usuario',
        resolution_method: resolved.method,
      });
      continue;
    }

    const newId = createUuidV7();
    supervisorIdByNormName.set(normalizeNameForCompare(row.name), newId);
    if (!options.dryRun) {
      await prisma.user.create({
        data: {
          id: newId,
          company_id: options.companyId,
          role: UserRole.SUPERVISOR,
          full_name: row.name,
          cpf: cpfGenerator.next(),
          email: finalEmail,
          phone: row.phone,
          manager_id: manager.id,
          supervisor_id: null,
          passwordHash: hashedSupervisorPassword,
          is_active: true,
        },
      });
    }

    resultRows.push({
      line: row.line,
      type: row.type,
      name: row.name,
      action: 'created',
      user_id: newId,
      role: UserRole.SUPERVISOR,
      supervisor_name: null,
      supervisor_id: null,
      phone: row.phone,
      email: finalEmail,
      reason: null,
      resolution_method: resolved.method,
    });
  }

  for (const row of vendorRows) {
    if (isPlaceholderName(row.name)) {
      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'skipped',
        user_id: null,
        role: null,
        supervisor_name: row.supervisorLabel,
        supervisor_id: null,
        phone: row.phone,
        email: row.email || null,
        reason: 'linha_placeholder',
        resolution_method: null,
      });
      continue;
    }

    const supervisorId = supervisorIdByNormName.get(normalizeNameForCompare(row.supervisorLabel));
    if (!supervisorId) {
      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'skipped',
        user_id: null,
        role: null,
        supervisor_name: row.supervisorLabel,
        supervisor_id: null,
        phone: row.phone,
        email: row.email || null,
        reason: 'supervisor_nao_resolvido',
        resolution_method: null,
      });
      continue;
    }

    const resolved = resolveExistingUser({
      row,
      usersByEmail,
      usersByPhone,
      usersByNormName,
      usersPool: users,
      usedUserIds,
      duplicatedPhones,
    });

    const finalEmail = row.email && !duplicatedEmails.has(row.email) ? row.email : null;

    if (resolved.method !== 'none') {
      usedUserIds.add(resolved.user.id);
      const finalPhone =
        duplicatedPhones.has(row.phone) && resolved.user.phone !== row.phone
          ? resolved.user.phone
          : row.phone;

      if (!options.dryRun) {
        await prisma.user.update({
          where: { id: resolved.user.id },
          data: {
            role: UserRole.VENDEDOR,
            full_name: row.name,
            email: finalEmail,
            phone: finalPhone,
            manager_id: null,
            supervisor_id: supervisorId,
            passwordHash: null,
            is_active: true,
            deleted_at: null,
          },
        });
      }

      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'updated',
        user_id: resolved.user.id,
        role: UserRole.VENDEDOR,
        supervisor_name: row.supervisorLabel,
        supervisor_id: supervisorId,
        phone: finalPhone,
        email: finalEmail,
        reason:
          duplicatedPhones.has(row.phone) && resolved.user.phone !== row.phone
            ? 'telefone_duplicado_na_planilha_mantido_telefone_anterior'
            : null,
        resolution_method: resolved.method,
      });
      continue;
    }

    if (duplicatedPhones.has(row.phone)) {
      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'skipped',
        user_id: null,
        role: null,
        supervisor_name: row.supervisorLabel,
        supervisor_id: supervisorId,
        phone: row.phone,
        email: finalEmail,
        reason: 'telefone_duplicado_na_planilha',
        resolution_method: resolved.method,
      });
      continue;
    }

    if (usersByPhone.has(row.phone)) {
      resultRows.push({
        line: row.line,
        type: row.type,
        name: row.name,
        action: 'skipped',
        user_id: null,
        role: null,
        supervisor_name: row.supervisorLabel,
        supervisor_id: supervisorId,
        phone: row.phone,
        email: finalEmail,
        reason: 'telefone_ja_usado_por_outro_usuario',
        resolution_method: resolved.method,
      });
      continue;
    }

    const newId = createUuidV7();
    if (!options.dryRun) {
      await prisma.user.create({
        data: {
          id: newId,
          company_id: options.companyId,
          role: UserRole.VENDEDOR,
          full_name: row.name,
          cpf: cpfGenerator.next(),
          email: finalEmail,
          phone: row.phone,
          manager_id: null,
          supervisor_id: supervisorId,
          passwordHash: null,
          is_active: true,
        },
      });
    }

    resultRows.push({
      line: row.line,
      type: row.type,
      name: row.name,
      action: 'created',
      user_id: newId,
      role: UserRole.VENDEDOR,
      supervisor_name: row.supervisorLabel,
      supervisor_id: supervisorId,
      phone: row.phone,
      email: finalEmail,
      reason: null,
      resolution_method: resolved.method,
    });
  }

  await writeResultCsv(options.outputCsvPath, resultRows);

  const summary = {
    input_rows: inputRows.length,
    supervisors_input: supervisorRows.length,
    vendors_input: vendorRows.length,
    updated: resultRows.filter((row) => row.action === 'updated').length,
    created: resultRows.filter((row) => row.action === 'created').length,
    skipped: resultRows.filter((row) => row.action === 'skipped').length,
    supervisors_updated_or_created: resultRows.filter(
      (row) => row.type === 'SUPERVISOR' && row.action !== 'skipped',
    ).length,
    vendors_updated_or_created: resultRows.filter(
      (row) => row.type === 'VENDEDOR' && row.action !== 'skipped',
    ).length,
    dry_run: options.dryRun,
    output_csv: options.outputCsvPath,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
