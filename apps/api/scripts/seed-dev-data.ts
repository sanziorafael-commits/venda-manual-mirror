import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

import { prisma } from '../src/lib/prisma.js';
import { normalizePhone } from '../src/utils/normalizers.js';

type SeedUserInput = {
  role: UserRole;
  fullName: string;
  cpf: string;
  email: string | null;
  phone: string;
  companyId: string | null;
  managerId?: string | null;
  supervisorId?: string | null;
  withPassword: boolean;
};

type SeededUser = {
  id: string;
  role: UserRole;
  fullName: string;
  companyId: string | null;
  phone: string;
};

type SeedVendorConversation = {
  user: SeededUser;
  supervisorName: string;
};

const PASSWORD = 'Handsell@123';
const SEED_FLOW_NAME = 'seed_dashboard_v1';

const COMPANIES = {
  norte: 'c000000000000000000000001',
  sul: 'c000000000000000000000002',
  centro: 'c000000000000000000000003',
} as const;

async function upsertSeedUser(input: SeedUserInput, passwordHash: string | null): Promise<SeededUser> {
  const normalizedPhone = normalizePhone(input.phone);

  const user = await prisma.user.upsert({
    where: {
      cpf: input.cpf,
    },
    update: {
      role: input.role,
      fullName: input.fullName,
      email: input.email,
      phone: normalizedPhone,
      companyId: input.companyId,
      managerId: input.managerId ?? null,
      supervisorId: input.supervisorId ?? null,
      passwordHash: input.withPassword ? passwordHash : null,
      isActive: true,
      deletedAt: null,
    },
    create: {
      role: input.role,
      fullName: input.fullName,
      cpf: input.cpf,
      email: input.email,
      phone: normalizedPhone,
      companyId: input.companyId,
      managerId: input.managerId ?? null,
      supervisorId: input.supervisorId ?? null,
      passwordHash: input.withPassword ? passwordHash : null,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      role: true,
      fullName: true,
      companyId: true,
      phone: true,
    },
  });

  return user;
}

async function cleanupPreviousSeedRows() {
  const rows = await prisma.historico_conversas.findMany({
    where: {
      flow_name: SEED_FLOW_NAME,
    },
    select: {
      id: true,
    },
  });

  if (rows.length === 0) {
    return;
  }

  const historyIds = rows.map((row) => row.id);

  await prisma.historico_conversas_produtos.deleteMany({
    where: {
      historico_id: {
        in: historyIds,
      },
    },
  });

  await prisma.historico_conversas.deleteMany({
    where: {
      id: {
        in: historyIds,
      },
    },
  });
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const admin = await upsertSeedUser(
    {
      role: UserRole.ADMIN,
      fullName: 'Admin HandSell',
      cpf: '90000000001',
      email: 'admin@handsell.dev',
      phone: '555191700001',
      companyId: null,
      withPassword: true,
    },
    passwordHash,
  );

  const managerNorte = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      fullName: 'Gerente Norte',
      cpf: '90000000011',
      email: 'gerente.norte@handsell.dev',
      phone: '555191700101',
      companyId: COMPANIES.norte,
      withPassword: true,
    },
    passwordHash,
  );

  const managerSul = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      fullName: 'Gerente Sul',
      cpf: '90000000021',
      email: 'gerente.sul@handsell.dev',
      phone: '555191700201',
      companyId: COMPANIES.sul,
      withPassword: true,
    },
    passwordHash,
  );

  const managerCentro = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      fullName: 'Gerente Centro',
      cpf: '90000000031',
      email: 'gerente.centro@handsell.dev',
      phone: '555191700301',
      companyId: COMPANIES.centro,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorNorteA = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor Norte A',
      cpf: '90000000012',
      email: 'supervisor.norte.a@handsell.dev',
      phone: '555191700102',
      companyId: COMPANIES.norte,
      managerId: managerNorte.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorNorteB = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor Norte B',
      cpf: '90000000013',
      email: 'supervisor.norte.b@handsell.dev',
      phone: '555191700103',
      companyId: COMPANIES.norte,
      managerId: managerNorte.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorSul = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor Sul',
      cpf: '90000000022',
      email: 'supervisor.sul@handsell.dev',
      phone: '555191700202',
      companyId: COMPANIES.sul,
      managerId: managerSul.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorCentro = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor Centro',
      cpf: '90000000032',
      email: 'supervisor.centro@handsell.dev',
      phone: '555191700302',
      companyId: COMPANIES.centro,
      managerId: managerCentro.id,
      withPassword: true,
    },
    passwordHash,
  );

  const vendorNorteA1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor Norte A1',
      cpf: '90000000014',
      email: null,
      phone: '553491549095',
      companyId: COMPANIES.norte,
      supervisorId: supervisorNorteA.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorNorteA2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor Norte A2',
      cpf: '90000000015',
      email: null,
      phone: '555191700104',
      companyId: COMPANIES.norte,
      supervisorId: supervisorNorteA.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorNorteB1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor Norte B1',
      cpf: '90000000016',
      email: null,
      phone: '555191700105',
      companyId: COMPANIES.norte,
      supervisorId: supervisorNorteB.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorSul1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor Sul 1',
      cpf: '90000000023',
      email: null,
      phone: '555191700203',
      companyId: COMPANIES.sul,
      supervisorId: supervisorSul.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorSul2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor Sul 2',
      cpf: '90000000024',
      email: null,
      phone: '555191700204',
      companyId: COMPANIES.sul,
      supervisorId: supervisorSul.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorCentro1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor Centro 1',
      cpf: '90000000033',
      email: null,
      phone: '555191700303',
      companyId: COMPANIES.centro,
      supervisorId: supervisorCentro.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorCentro2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor Centro 2',
      cpf: '90000000034',
      email: null,
      phone: '555191700304',
      companyId: COMPANIES.centro,
      supervisorId: supervisorCentro.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorConversations: SeedVendorConversation[] = [
    { user: supervisorNorteA, supervisorName: supervisorNorteA.fullName },
    { user: supervisorNorteB, supervisorName: supervisorNorteB.fullName },
    { user: supervisorSul, supervisorName: supervisorSul.fullName },
    { user: supervisorCentro, supervisorName: supervisorCentro.fullName },
    { user: vendorNorteA1, supervisorName: supervisorNorteA.fullName },
    { user: vendorNorteA2, supervisorName: supervisorNorteA.fullName },
    { user: vendorNorteB1, supervisorName: supervisorNorteB.fullName },
    { user: vendorSul1, supervisorName: supervisorSul.fullName },
    { user: vendorSul2, supervisorName: supervisorSul.fullName },
    { user: vendorCentro1, supervisorName: supervisorCentro.fullName },
    { user: vendorCentro2, supervisorName: supervisorCentro.fullName },
  ];

  return {
    admin,
    managerNorte,
    managerSul,
    managerCentro,
    supervisorNorteA,
    supervisorNorteB,
    supervisorSul,
    supervisorCentro,
    vendorConversations,
  };
}

async function bindLegacyHistoryByPhone(vendor: SeededUser, supervisorName: string) {
  const updated = await prisma.historico_conversas.updateMany({
    where: {
      vendedor_telefone: vendor.phone,
      OR: [
        {
          company_id: null,
        },
        {
          company_id: vendor.companyId,
        },
      ],
    },
    data: {
      user_id: vendor.id,
      company_id: vendor.companyId,
      supervisor: supervisorName,
      vendedor_nome: vendor.fullName,
    },
  });

  return updated.count;
}

async function seedConversationHistory(vendors: SeedVendorConversation[]) {
  await cleanupPreviousSeedRows();

  const companyIds = Array.from(
    new Set(vendors.map((entry) => entry.user.companyId).filter((value): value is string => Boolean(value))),
  );

  const products = await prisma.produtos.findMany({
    where: {
      company_id: {
        in: companyIds,
      },
    },
    select: {
      id: true,
      nome: true,
      company_id: true,
      codigo_interno_sku: true,
    },
    orderBy: [{ company_id: 'asc' }, { nome: 'asc' }],
  });

  const productsByCompany = new Map<string, typeof products>();
  for (const product of products) {
    if (!product.company_id) {
      continue;
    }

    const current = productsByCompany.get(product.company_id) ?? [];
    if (current.length < 6) {
      current.push(product);
      productsByCompany.set(product.company_id, current);
    }
  }

  const now = new Date();
  let insertedHistory = 0;
  let insertedCitations = 0;
  const interactionProfiles = [
    { clients: 2, roundsPerClient: 3, turnsPerRound: 2 },
    { clients: 3, roundsPerClient: 3, turnsPerRound: 2 },
    { clients: 3, roundsPerClient: 4, turnsPerRound: 2 },
    { clients: 3, roundsPerClient: 4, turnsPerRound: 3 },
    { clients: 4, roundsPerClient: 4, turnsPerRound: 3 },
  ] as const;

  for (let vendorIndex = 0; vendorIndex < vendors.length; vendorIndex += 1) {
    const entry = vendors[vendorIndex];
    if (!entry.user.companyId) {
      continue;
    }

    const companyProducts = productsByCompany.get(entry.user.companyId) ?? [];
    if (companyProducts.length === 0) {
      continue;
    }

    const profile = interactionProfiles[vendorIndex % interactionProfiles.length];
    const preferredProductOffsets = [
      vendorIndex % companyProducts.length,
      (vendorIndex + 1) % companyProducts.length,
      (vendorIndex + 3) % companyProducts.length,
    ];
    const clientNames = Array.from(
      { length: profile.clients },
      (_, clientIndex) => `Cliente Seed ${vendorIndex + 1}-${clientIndex + 1}`,
    );

    for (let clientIndex = 0; clientIndex < clientNames.length; clientIndex += 1) {
      const clientName = clientNames[clientIndex];

      for (let interactionRound = 0; interactionRound < profile.roundsPerClient; interactionRound += 1) {
        const interactionIndex = clientIndex * profile.roundsPerClient + interactionRound;
        const daysAgo = (clientIndex * 5 + interactionRound * 2 + vendorIndex * 3) % 28;
        const minutesAgo = vendorIndex * 29 + clientIndex * 17 + interactionRound * 11;
        const baseTimestamp = new Date(now);
        baseTimestamp.setDate(baseTimestamp.getDate() - daysAgo);
        baseTimestamp.setMinutes(baseTimestamp.getMinutes() - minutesAgo);

        for (let turnIndex = 0; turnIndex < profile.turnsPerRound; turnIndex += 1) {
          const productSelector =
            (clientIndex * 7 + interactionRound * 5 + turnIndex * 3 + vendorIndex) % 10;
          const primaryOffset =
            preferredProductOffsets[
              (interactionRound + turnIndex + clientIndex) % preferredProductOffsets.length
            ];
          const secondaryOffset = (primaryOffset + clientIndex + 2) % companyProducts.length;
          const turnProductIndex = productSelector < 7 ? primaryOffset : secondaryOffset;
          const turnProduct = companyProducts[turnProductIndex];
          const timestamp = new Date(baseTimestamp);
          timestamp.setMinutes(timestamp.getMinutes() + turnIndex * 5);

          const created = await prisma.historico_conversas.create({
            data: {
              timestamp_iso: timestamp,
              data: timestamp,
              msg_type: 'text',
              flow_name: SEED_FLOW_NAME,
              execution_id: `seed-exec-${entry.user.id}-${clientIndex}-${interactionRound}-${turnIndex}`,
              message_id: `seed-msg-${entry.user.id}-${clientIndex}-${interactionRound}-${turnIndex}`,
              mensagem: `Interacao ${interactionRound + 1}.${turnIndex + 1}: cliente pediu orientacao sobre ${turnProduct.nome}.`,
              resposta: `Sugestao enviada para ${turnProduct.nome}. Codigo interno: ${turnProduct.codigo_interno_sku ?? 'N/A'}.`,
              vendedor_nome: entry.user.fullName,
              vendedor_telefone: entry.user.phone,
              supervisor: entry.supervisorName,
              cliente_nome: clientName,
              user_id: entry.user.id,
              company_id: entry.user.companyId,
            },
            select: {
              id: true,
            },
          });

          insertedHistory += 1;

          const citedProductIndexes = new Set<number>([turnProductIndex]);
          if ((interactionRound + turnIndex + vendorIndex) % 4 === 0 && companyProducts.length > 1) {
            citedProductIndexes.add((turnProductIndex + 1 + clientIndex) % companyProducts.length);
          }
          if ((interactionRound + clientIndex + vendorIndex) % 7 === 0 && companyProducts.length > 2) {
            citedProductIndexes.add((turnProductIndex + 2 + turnIndex) % companyProducts.length);
          }

          for (const citedProductIndex of citedProductIndexes) {
            const citedProduct = companyProducts[citedProductIndex];

            await prisma.historico_conversas_produtos.create({
              data: {
                historico_id: created.id,
                produto_id: citedProduct.id,
                company_id: entry.user.companyId,
                cited_at: timestamp,
                source: SEED_FLOW_NAME,
              },
            });

            insertedCitations += 1;
          }
        }
      }
    }
  }

  return {
    insertedHistory,
    insertedCitations,
  };
}

async function main() {
  const seededUsers = await seedUsers();
  const legacyLinked = await bindLegacyHistoryByPhone(
    seededUsers.vendorConversations[0].user,
    seededUsers.vendorConversations[0].supervisorName,
  );
  const seededHistory = await seedConversationHistory(seededUsers.vendorConversations);

  const totalUsers = await prisma.user.count({
    where: {
      deletedAt: null,
    },
  });

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    where: {
      deletedAt: null,
    },
    _count: {
      _all: true,
    },
  });

  const totalHistory = await prisma.historico_conversas.count();
  const totalCitations = await prisma.historico_conversas_produtos.count();

  console.log('Seed concluido com sucesso.');
  console.log(
    JSON.stringify(
      {
        credentials: {
          password: PASSWORD,
          admin: 'admin@handsell.dev',
          managerNorte: 'gerente.norte@handsell.dev',
          managerSul: 'gerente.sul@handsell.dev',
          managerCentro: 'gerente.centro@handsell.dev',
          supervisorNorteA: 'supervisor.norte.a@handsell.dev',
          supervisorNorteB: 'supervisor.norte.b@handsell.dev',
          supervisorSul: 'supervisor.sul@handsell.dev',
          supervisorCentro: 'supervisor.centro@handsell.dev',
        },
        legacyLinked,
        seededHistory,
        totals: {
          users: totalUsers,
          usersByRole,
          history: totalHistory,
          citations: totalCitations,
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
