import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

import { prisma } from '../src/lib/prisma.js';
import { normalizePhone } from '../src/utils/normalizers.js';

const PASSWORD = 'Handsell@123';
const EMAIL_DOMAIN = 'handsell.dev';
const LEGACY_EMAIL_PREFIX = 'diretor+';

const DIRECTOR_ALIAS_BY_COMPANY_ID: Record<string, string> = {
  c000000000000000000000001: 'norte',
  c000000000000000000000002: 'sul',
  c000000000000000000000003: 'centro',
  c000000000000000000000000: 'base',
};

type SeededDirectorResult = {
  id: string;
  companyId: string;
  companyName: string;
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  action: 'created' | 'updated';
};

async function resolveAvailableCpf(seedIndex: number) {
  for (let attempt = 0; attempt <= 99_999; attempt += 1) {
    const cpfCandidate = `97${String(seedIndex).padStart(4, '0')}${String(attempt).padStart(5, '0')}`;
    const existing = await prisma.user.findUnique({
      where: {
        cpf: cpfCandidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return cpfCandidate;
    }
  }

  throw new Error(`Nao foi possivel gerar CPF livre para seed index ${seedIndex}`);
}

async function resolveAvailablePhone(companyId: string, seedIndex: number) {
  for (let attempt = 0; attempt <= 99; attempt += 1) {
    const rawPhone = `55519179${String(seedIndex).padStart(2, '0')}${String(attempt).padStart(2, '0')}`;
    const phoneCandidate = normalizePhone(rawPhone);

    const existing = await prisma.user.findFirst({
      where: {
        companyId,
        phone: phoneCandidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return phoneCandidate;
    }
  }

  throw new Error(`Nao foi possivel gerar telefone livre para companyId ${companyId}`);
}

function normalizeAliasToken(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.{2,}/g, '.');
}

function resolveDirectorAlias(companyId: string, companyName: string) {
  const byCompanyId = DIRECTOR_ALIAS_BY_COMPANY_ID[companyId];
  if (byCompanyId) {
    return byCompanyId;
  }

  const normalizedName = normalizeAliasToken(companyName).replace(/\./g, ' ');
  if (normalizedName.includes('norte')) {
    return 'norte';
  }

  if (normalizedName.includes('sul')) {
    return 'sul';
  }

  if (normalizedName.includes('centro')) {
    return 'centro';
  }

  if (normalizedName.includes('base')) {
    return 'base';
  }

  const fallback = normalizeAliasToken(companyName)
    .split('.')
    .filter((token) => token.length > 0 && token !== 'empresa' && token !== 'dev' && token !== 'focatto')
    .slice(0, 2)
    .join('.');

  if (fallback.length > 0) {
    return fallback;
  }

  return companyId.slice(-6);
}

function buildDirectorEmail(companyId: string, companyName: string) {
  const alias = resolveDirectorAlias(companyId, companyName);
  return `diretor.${alias}@${EMAIL_DOMAIN}`;
}

function buildLegacyDirectorEmail(companyId: string) {
  return `${LEGACY_EMAIL_PREFIX}${companyId}@${EMAIL_DOMAIN}`;
}

async function seedDirectorForCompany(input: {
  companyId: string;
  companyName: string;
  seedIndex: number;
  passwordHash: string;
}): Promise<SeededDirectorResult> {
  const fullName = `Diretor ${input.companyName}`.trim();
  const email = buildDirectorEmail(input.companyId, input.companyName);
  const legacyEmail = buildLegacyDirectorEmail(input.companyId);

  const [existingDirectorByCompany, existingByKnownEmail] = await Promise.all([
    prisma.user.findFirst({
      where: {
        role: UserRole.DIRETOR,
        companyId: input.companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        email: {
          in: [email, legacyEmail],
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  const targetUserId = existingDirectorByCompany?.id ?? existingByKnownEmail?.id ?? null;

  if (targetUserId) {
    const emailOwner = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (emailOwner && emailOwner.id !== targetUserId) {
      throw new Error(`Email ${email} ja utilizado por outro usuario (${emailOwner.id})`);
    }

    const updated = await prisma.user.update({
      where: {
        id: targetUserId,
      },
      data: {
        role: UserRole.DIRETOR,
        fullName,
        email,
        companyId: input.companyId,
        managerId: null,
        supervisorId: null,
        passwordHash: input.passwordHash,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        fullName: true,
        email: true,
        cpf: true,
        phone: true,
      },
    });

    return {
      id: updated.id,
      companyId: updated.companyId!,
      companyName: input.companyName,
      fullName: updated.fullName,
      email: updated.email!,
      cpf: updated.cpf,
      phone: updated.phone,
      action: 'updated',
    };
  }

  const cpf = await resolveAvailableCpf(input.seedIndex);
  const phone = await resolveAvailablePhone(input.companyId, input.seedIndex);

  const existingWithNewEmail = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingWithNewEmail) {
    throw new Error(`Email ${email} ja utilizado por outro usuario (${existingWithNewEmail.id})`);
  }

  const created = await prisma.user.create({
    data: {
      role: UserRole.DIRETOR,
      fullName,
      cpf,
      email,
      phone,
      companyId: input.companyId,
      managerId: null,
      supervisorId: null,
      passwordHash: input.passwordHash,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      companyId: true,
      fullName: true,
      email: true,
      cpf: true,
      phone: true,
    },
  });

  return {
    id: created.id,
    companyId: created.companyId!,
    companyName: input.companyName,
    fullName: created.fullName,
    email: created.email!,
    cpf: created.cpf,
    phone: created.phone,
    action: 'created',
  };
}

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  if (companies.length === 0) {
    throw new Error('Nenhuma empresa ativa encontrada para seed de diretor');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const directors: SeededDirectorResult[] = [];

  for (let index = 0; index < companies.length; index += 1) {
    const company = companies[index];
    const seededDirector = await seedDirectorForCompany({
      companyId: company.id,
      companyName: company.name,
      seedIndex: index + 1,
      passwordHash,
    });
    directors.push(seededDirector);
  }

  const directorsCount = await prisma.user.count({
    where: {
      role: UserRole.DIRETOR,
      deletedAt: null,
    },
  });

  console.log('Seed de diretores concluido com sucesso.');
  console.log(
    JSON.stringify(
      {
        credentials: {
          password: PASSWORD,
        },
        directors,
        totals: {
          activeCompanies: companies.length,
          activeDirectors: directorsCount,
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
