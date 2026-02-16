import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

import { prisma } from '../src/lib/prisma.js';
import { normalizePhone } from '../src/utils/normalizers.js';

type SeedCompanyKey = 'a' | 'b' | 'c';

type SeedCompanyConfig = {
  key: SeedCompanyKey;
  id: string;
  name: string;
  cnpj: string;
};

type SeedProductConfig = {
  id: string;
  companyKey: SeedCompanyKey;
  name: string;
  sku: string;
  brand: string;
};

type SeedCompanyMap = Record<
  SeedCompanyKey,
  {
    id: string;
    name: string;
    cnpj: string;
  }
>;

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

const SEED_COMPANIES: SeedCompanyConfig[] = [
  {
    key: 'a',
    id: 'c000000000000000000000001',
    name: 'Distribuidor A DEV',
    cnpj: '11111111000101',
  },
  {
    key: 'b',
    id: 'c000000000000000000000002',
    name: 'Distribuidor B DEV',
    cnpj: '22222222000101',
  },
  {
    key: 'c',
    id: 'c000000000000000000000003',
    name: 'Distribuidor C DEV',
    cnpj: '33333333000101',
  },
];

const SEED_PRODUCTS: SeedProductConfig[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    companyKey: 'a',
    name: 'Produto A - Mix Tradicional',
    sku: 'A-001',
    brand: 'Marca A',
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    companyKey: 'a',
    name: 'Produto A - Molho Especial',
    sku: 'A-002',
    brand: 'Marca A',
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    companyKey: 'a',
    name: 'Produto A - Base Premium',
    sku: 'A-003',
    brand: 'Marca A',
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    companyKey: 'a',
    name: 'Produto A - Linha Profissional',
    sku: 'A-004',
    brand: 'Marca A',
  },
  {
    id: '00000000-0000-4000-8000-000000000105',
    companyKey: 'a',
    name: 'Produto A - Linha Economica',
    sku: 'A-005',
    brand: 'Marca A',
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    companyKey: 'a',
    name: 'Produto A - Versao Chef',
    sku: 'A-006',
    brand: 'Marca A',
  },
  {
    id: '00000000-0000-4000-8000-000000000201',
    companyKey: 'b',
    name: 'Produto B - Mix Tradicional',
    sku: 'B-001',
    brand: 'Marca B',
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    companyKey: 'b',
    name: 'Produto B - Molho Especial',
    sku: 'B-002',
    brand: 'Marca B',
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    companyKey: 'b',
    name: 'Produto B - Base Premium',
    sku: 'B-003',
    brand: 'Marca B',
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    companyKey: 'b',
    name: 'Produto B - Linha Profissional',
    sku: 'B-004',
    brand: 'Marca B',
  },
  {
    id: '00000000-0000-4000-8000-000000000205',
    companyKey: 'b',
    name: 'Produto B - Linha Economica',
    sku: 'B-005',
    brand: 'Marca B',
  },
  {
    id: '00000000-0000-4000-8000-000000000206',
    companyKey: 'b',
    name: 'Produto B - Versao Chef',
    sku: 'B-006',
    brand: 'Marca B',
  },
  {
    id: '00000000-0000-4000-8000-000000000301',
    companyKey: 'c',
    name: 'Produto C - Mix Tradicional',
    sku: 'C-001',
    brand: 'Marca C',
  },
  {
    id: '00000000-0000-4000-8000-000000000302',
    companyKey: 'c',
    name: 'Produto C - Molho Especial',
    sku: 'C-002',
    brand: 'Marca C',
  },
  {
    id: '00000000-0000-4000-8000-000000000303',
    companyKey: 'c',
    name: 'Produto C - Base Premium',
    sku: 'C-003',
    brand: 'Marca C',
  },
  {
    id: '00000000-0000-4000-8000-000000000304',
    companyKey: 'c',
    name: 'Produto C - Linha Profissional',
    sku: 'C-004',
    brand: 'Marca C',
  },
  {
    id: '00000000-0000-4000-8000-000000000305',
    companyKey: 'c',
    name: 'Produto C - Linha Economica',
    sku: 'C-005',
    brand: 'Marca C',
  },
  {
    id: '00000000-0000-4000-8000-000000000306',
    companyKey: 'c',
    name: 'Produto C - Versao Chef',
    sku: 'C-006',
    brand: 'Marca C',
  },
];

async function upsertSeedCompanies(): Promise<SeedCompanyMap> {
  const companies = {} as SeedCompanyMap;

  for (const company of SEED_COMPANIES) {
    const saved = await prisma.company.upsert({
      where: {
        id: company.id,
      },
      update: {
        name: company.name,
        cnpj: company.cnpj,
        deletedAt: null,
      },
      create: {
        id: company.id,
        name: company.name,
        cnpj: company.cnpj,
      },
      select: {
        id: true,
        name: true,
        cnpj: true,
      },
    });

    companies[company.key] = saved;
  }

  return companies;
}

async function upsertSeedProducts(companies: SeedCompanyMap) {
  for (const product of SEED_PRODUCTS) {
    const company = companies[product.companyKey];

    await prisma.produtos.upsert({
      where: {
        id: product.id,
      },
      update: {
        company_id: company.id,
        nome: product.name,
        codigo_interno_sku: product.sku,
        marca: product.brand,
      },
      create: {
        id: product.id,
        company_id: company.id,
        nome: product.name,
        codigo_interno_sku: product.sku,
        marca: product.brand,
      },
    });
  }
}

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
  await prisma.historico_conversas_produtos.deleteMany({
    where: {
      source: SEED_FLOW_NAME,
    },
  });

  await prisma.historico_conversas.deleteMany({
    where: {
      flow_name: SEED_FLOW_NAME,
    },
  });
}

async function seedUsers(companies: SeedCompanyMap) {
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

  const directorA = await upsertSeedUser(
    {
      role: UserRole.DIRETOR,
      fullName: 'Diretor Distribuidor A',
      cpf: '90000000041',
      email: 'diretor.a@handsell.dev',
      phone: '555191700401',
      companyId: companies.a.id,
      withPassword: true,
    },
    passwordHash,
  );

  const directorB = await upsertSeedUser(
    {
      role: UserRole.DIRETOR,
      fullName: 'Diretor Distribuidor B',
      cpf: '90000000051',
      email: 'diretor.b@handsell.dev',
      phone: '555191700501',
      companyId: companies.b.id,
      withPassword: true,
    },
    passwordHash,
  );

  const directorC = await upsertSeedUser(
    {
      role: UserRole.DIRETOR,
      fullName: 'Diretor Distribuidor C',
      cpf: '90000000061',
      email: 'diretor.c@handsell.dev',
      phone: '555191700601',
      companyId: companies.c.id,
      withPassword: true,
    },
    passwordHash,
  );

  const managerA = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      fullName: 'Gerente A',
      cpf: '90000000011',
      email: 'gerente.a@handsell.dev',
      phone: '555191700101',
      companyId: companies.a.id,
      withPassword: true,
    },
    passwordHash,
  );

  const managerB = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      fullName: 'Gerente B',
      cpf: '90000000021',
      email: 'gerente.b@handsell.dev',
      phone: '555191700201',
      companyId: companies.b.id,
      withPassword: true,
    },
    passwordHash,
  );

  const managerC = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      fullName: 'Gerente C',
      cpf: '90000000031',
      email: 'gerente.c@handsell.dev',
      phone: '555191700301',
      companyId: companies.c.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorA1 = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor A 1',
      cpf: '90000000012',
      email: 'supervisor.a.1@handsell.dev',
      phone: '555191700102',
      companyId: companies.a.id,
      managerId: managerA.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorA2 = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor A 2',
      cpf: '90000000013',
      email: 'supervisor.a.2@handsell.dev',
      phone: '555191700103',
      companyId: companies.a.id,
      managerId: managerA.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorB = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor B',
      cpf: '90000000022',
      email: 'supervisor.b@handsell.dev',
      phone: '555191700202',
      companyId: companies.b.id,
      managerId: managerB.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorC = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      fullName: 'Supervisor C',
      cpf: '90000000032',
      email: 'supervisor.c@handsell.dev',
      phone: '555191700302',
      companyId: companies.c.id,
      managerId: managerC.id,
      withPassword: true,
    },
    passwordHash,
  );

  const vendorA1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor A 1',
      cpf: '90000000014',
      email: null,
      phone: '555191700104',
      companyId: companies.a.id,
      supervisorId: supervisorA1.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorA2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor A 2',
      cpf: '90000000015',
      email: null,
      phone: '555191700105',
      companyId: companies.a.id,
      supervisorId: supervisorA1.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorA3 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor A 3',
      cpf: '90000000016',
      email: null,
      phone: '555191700106',
      companyId: companies.a.id,
      supervisorId: supervisorA2.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorB1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor B 1',
      cpf: '90000000023',
      email: null,
      phone: '555191700203',
      companyId: companies.b.id,
      supervisorId: supervisorB.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorB2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor B 2',
      cpf: '90000000024',
      email: null,
      phone: '555191700204',
      companyId: companies.b.id,
      supervisorId: supervisorB.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorC1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor C 1',
      cpf: '90000000033',
      email: null,
      phone: '555191700303',
      companyId: companies.c.id,
      supervisorId: supervisorC.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorC2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      fullName: 'Vendedor C 2',
      cpf: '90000000034',
      email: null,
      phone: '555191700304',
      companyId: companies.c.id,
      supervisorId: supervisorC.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorConversations: SeedVendorConversation[] = [
    { user: supervisorA1, supervisorName: supervisorA1.fullName },
    { user: supervisorA2, supervisorName: supervisorA2.fullName },
    { user: supervisorB, supervisorName: supervisorB.fullName },
    { user: supervisorC, supervisorName: supervisorC.fullName },
    { user: vendorA1, supervisorName: supervisorA1.fullName },
    { user: vendorA2, supervisorName: supervisorA1.fullName },
    { user: vendorA3, supervisorName: supervisorA2.fullName },
    { user: vendorB1, supervisorName: supervisorB.fullName },
    { user: vendorB2, supervisorName: supervisorB.fullName },
    { user: vendorC1, supervisorName: supervisorC.fullName },
    { user: vendorC2, supervisorName: supervisorC.fullName },
  ];

  return {
    admin,
    directorA,
    directorB,
    directorC,
    managerA,
    managerB,
    managerC,
    supervisorA1,
    supervisorA2,
    supervisorB,
    supervisorC,
    vendorConversations,
  };
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
  const companies = await upsertSeedCompanies();
  await upsertSeedProducts(companies);
  const seededUsers = await seedUsers(companies);
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

  const totalCompanies = await prisma.company.count({
    where: {
      deletedAt: null,
    },
  });

  const totalProducts = await prisma.produtos.count();
  const totalHistory = await prisma.historico_conversas.count();
  const totalCitations = await prisma.historico_conversas_produtos.count();

  console.log('Seed concluido com sucesso.');
  console.log(
    JSON.stringify(
      {
        credentials: {
          password: PASSWORD,
          admin: [
            'admin@handsell.dev (Admin HandSell)',
          ],
          diretor: [
            `diretor.a@handsell.dev (Diretor Distribuidor A, ${companies.a.name})`,
            `diretor.b@handsell.dev (Diretor Distribuidor B, ${companies.b.name})`,
            `diretor.c@handsell.dev (Diretor Distribuidor C, ${companies.c.name})`,
          ],
          gerente_comercial: [
            `gerente.a@handsell.dev (Gerente A, ${companies.a.name})`,
            `gerente.b@handsell.dev (Gerente B, ${companies.b.name})`,
            `gerente.c@handsell.dev (Gerente C, ${companies.c.name})`,
          ],
          supervisor: [
            `supervisor.a.1@handsell.dev (Supervisor A 1, ${companies.a.name})`,
            `supervisor.a.2@handsell.dev (Supervisor A 2, ${companies.a.name})`,
            `supervisor.b@handsell.dev (Supervisor B, ${companies.b.name})`,
            `supervisor.c@handsell.dev (Supervisor C, ${companies.c.name})`,
          ],
        },
        seededHistory,
        totals: {
          companies: totalCompanies,
          products: totalProducts,
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
