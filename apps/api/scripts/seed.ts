import { LocatedClientStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

import { prisma } from '../src/lib/prisma.js';
import { normalizePhone } from '../src/utils/normalizers.js';
import { createUuidV7 } from '../src/utils/uuid.js';

type SeedCompanyKey = 'a' | 'b' | 'c';

type SeedCompanyConfig = {
  key: SeedCompanyKey;
  name: string;
  cnpj: string;
};

type SeedProductConfig = {
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
  full_name: string;
  cpf: string;
  email: string | null;
  phone: string;
  company_id: string | null;
  manager_id?: string | null;
  supervisor_id?: string | null;
  withPassword: boolean;
};

type SeededUser = {
  id: string;
  role: UserRole;
  full_name: string;
  company_id: string | null;
  phone: string;
};

type SeedVendorConversation = {
  user: SeededUser;
  supervisorName: string;
};

type SeedUsersBundle = {
  supervisorA1: SeededUser;
  supervisorA2: SeededUser;
  supervisorB: SeededUser;
  supervisorC: SeededUser;
  vendorConversations: SeedVendorConversation[];
};

type SeedLocatedClientsSummary = {
  inserted: number;
  visited: number;
  pending_visit: number;
};

const PASSWORD = 'Handsell@123';
const SEED_FLOW_NAME = 'seed_dashboard_v1';
const SEED_LOCATED_CLIENT_NAME_PREFIX = 'Cliente Localizado Seed';

const SEED_COMPANIES: SeedCompanyConfig[] = [
  {
    key: 'a',
    name: 'Distribuidor A DEV',
    cnpj: '11111111000101',
  },
  {
    key: 'b',
    name: 'Distribuidor B DEV',
    cnpj: '22222222000101',
  },
  {
    key: 'c',
    name: 'Distribuidor C DEV',
    cnpj: '33333333000101',
  },
];

const SEED_PRODUCTS: SeedProductConfig[] = [
  {
    companyKey: 'a',
    name: 'Produto A - Mix Tradicional',
    sku: 'A-001',
    brand: 'Marca A',
  },
  {
    companyKey: 'a',
    name: 'Produto A - Molho Especial',
    sku: 'A-002',
    brand: 'Marca A',
  },
  {
    companyKey: 'a',
    name: 'Produto A - Base Premium',
    sku: 'A-003',
    brand: 'Marca A',
  },
  {
    companyKey: 'a',
    name: 'Produto A - Linha Profissional',
    sku: 'A-004',
    brand: 'Marca A',
  },
  {
    companyKey: 'a',
    name: 'Produto A - Linha Economica',
    sku: 'A-005',
    brand: 'Marca A',
  },
  {
    companyKey: 'a',
    name: 'Produto A - Versao Chef',
    sku: 'A-006',
    brand: 'Marca A',
  },
  {
    companyKey: 'b',
    name: 'Produto B - Mix Tradicional',
    sku: 'B-001',
    brand: 'Marca B',
  },
  {
    companyKey: 'b',
    name: 'Produto B - Molho Especial',
    sku: 'B-002',
    brand: 'Marca B',
  },
  {
    companyKey: 'b',
    name: 'Produto B - Base Premium',
    sku: 'B-003',
    brand: 'Marca B',
  },
  {
    companyKey: 'b',
    name: 'Produto B - Linha Profissional',
    sku: 'B-004',
    brand: 'Marca B',
  },
  {
    companyKey: 'b',
    name: 'Produto B - Linha Economica',
    sku: 'B-005',
    brand: 'Marca B',
  },
  {
    companyKey: 'b',
    name: 'Produto B - Versao Chef',
    sku: 'B-006',
    brand: 'Marca B',
  },
  {
    companyKey: 'c',
    name: 'Produto C - Mix Tradicional',
    sku: 'C-001',
    brand: 'Marca C',
  },
  {
    companyKey: 'c',
    name: 'Produto C - Molho Especial',
    sku: 'C-002',
    brand: 'Marca C',
  },
  {
    companyKey: 'c',
    name: 'Produto C - Base Premium',
    sku: 'C-003',
    brand: 'Marca C',
  },
  {
    companyKey: 'c',
    name: 'Produto C - Linha Profissional',
    sku: 'C-004',
    brand: 'Marca C',
  },
  {
    companyKey: 'c',
    name: 'Produto C - Linha Economica',
    sku: 'C-005',
    brand: 'Marca C',
  },
  {
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
        cnpj: company.cnpj,
      },
      update: {
        name: company.name,
        cnpj: company.cnpj,
        deleted_at: null,
      },
      create: {
        id: createUuidV7(),
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
    const existing = await prisma.produtos.findFirst({
      where: {
        company_id: company.id,
        codigo_interno_sku: product.sku,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.produtos.update({
        where: {
          id: existing.id,
        },
        data: {
          company_id: company.id,
          nome: product.name,
          codigo_interno_sku: product.sku,
          marca: product.brand,
          deleted_at: null,
        },
      });
      continue;
    }

    await prisma.produtos.create({
      data: {
        id: createUuidV7(),
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
      full_name: input.full_name,
      email: input.email,
      phone: normalizedPhone,
      company_id: input.company_id,
      manager_id: input.manager_id ?? null,
      supervisor_id: input.supervisor_id ?? null,
      passwordHash: input.withPassword ? passwordHash : null,
      is_active: true,
      deleted_at: null,
    },
    create: {
      id: createUuidV7(),
      role: input.role,
      full_name: input.full_name,
      cpf: input.cpf,
      email: input.email,
      phone: normalizedPhone,
      company_id: input.company_id,
      manager_id: input.manager_id ?? null,
      supervisor_id: input.supervisor_id ?? null,
      passwordHash: input.withPassword ? passwordHash : null,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      role: true,
      full_name: true,
      company_id: true,
      phone: true,
    },
  });

  return user;
}

async function cleanupPreviousSeedRows() {
  await prisma.locatedClient.deleteMany({
    where: {
      customer_name: {
        startsWith: SEED_LOCATED_CLIENT_NAME_PREFIX,
      },
    },
  });

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
      full_name: 'Admin HandSell',
      cpf: '90000000001',
      email: 'admin@handsell.dev',
      phone: '555191700001',
      company_id: null,
      withPassword: true,
    },
    passwordHash,
  );

  const directorA = await upsertSeedUser(
    {
      role: UserRole.DIRETOR,
      full_name: 'Diretor Distribuidor A',
      cpf: '90000000041',
      email: 'diretor.a@handsell.dev',
      phone: '555191700401',
      company_id: companies.a.id,
      withPassword: true,
    },
    passwordHash,
  );

  const directorB = await upsertSeedUser(
    {
      role: UserRole.DIRETOR,
      full_name: 'Diretor Distribuidor B',
      cpf: '90000000051',
      email: 'diretor.b@handsell.dev',
      phone: '555191700501',
      company_id: companies.b.id,
      withPassword: true,
    },
    passwordHash,
  );

  const directorC = await upsertSeedUser(
    {
      role: UserRole.DIRETOR,
      full_name: 'Diretor Distribuidor C',
      cpf: '90000000061',
      email: 'diretor.c@handsell.dev',
      phone: '555191700601',
      company_id: companies.c.id,
      withPassword: true,
    },
    passwordHash,
  );

  const managerA = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      full_name: 'Gerente A',
      cpf: '90000000011',
      email: 'gerente.a@handsell.dev',
      phone: '555191700101',
      company_id: companies.a.id,
      withPassword: true,
    },
    passwordHash,
  );

  const managerB = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      full_name: 'Gerente B',
      cpf: '90000000021',
      email: 'gerente.b@handsell.dev',
      phone: '555191700201',
      company_id: companies.b.id,
      withPassword: true,
    },
    passwordHash,
  );

  const managerC = await upsertSeedUser(
    {
      role: UserRole.GERENTE_COMERCIAL,
      full_name: 'Gerente C',
      cpf: '90000000031',
      email: 'gerente.c@handsell.dev',
      phone: '555191700301',
      company_id: companies.c.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorA1 = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      full_name: 'Supervisor A 1',
      cpf: '90000000012',
      email: 'supervisor.a.1@handsell.dev',
      phone: '555191700102',
      company_id: companies.a.id,
      manager_id: managerA.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorA2 = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      full_name: 'Supervisor A 2',
      cpf: '90000000013',
      email: 'supervisor.a.2@handsell.dev',
      phone: '555191700103',
      company_id: companies.a.id,
      manager_id: managerA.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorB = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      full_name: 'Supervisor B',
      cpf: '90000000022',
      email: 'supervisor.b@handsell.dev',
      phone: '555191700202',
      company_id: companies.b.id,
      manager_id: managerB.id,
      withPassword: true,
    },
    passwordHash,
  );

  const supervisorC = await upsertSeedUser(
    {
      role: UserRole.SUPERVISOR,
      full_name: 'Supervisor C',
      cpf: '90000000032',
      email: 'supervisor.c@handsell.dev',
      phone: '555191700302',
      company_id: companies.c.id,
      manager_id: managerC.id,
      withPassword: true,
    },
    passwordHash,
  );

  const vendorA1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      full_name: 'Vendedor A 1',
      cpf: '90000000014',
      email: null,
      phone: '555191700104',
      company_id: companies.a.id,
      supervisor_id: supervisorA1.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorA2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      full_name: 'Vendedor A 2',
      cpf: '90000000015',
      email: null,
      phone: '555191700105',
      company_id: companies.a.id,
      supervisor_id: supervisorA1.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorA3 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      full_name: 'Vendedor A 3',
      cpf: '90000000016',
      email: null,
      phone: '555191700106',
      company_id: companies.a.id,
      supervisor_id: supervisorA2.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorB1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      full_name: 'Vendedor B 1',
      cpf: '90000000023',
      email: null,
      phone: '555191700203',
      company_id: companies.b.id,
      supervisor_id: supervisorB.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorB2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      full_name: 'Vendedor B 2',
      cpf: '90000000024',
      email: null,
      phone: '555191700204',
      company_id: companies.b.id,
      supervisor_id: supervisorB.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorC1 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      full_name: 'Vendedor C 1',
      cpf: '90000000033',
      email: null,
      phone: '555191700303',
      company_id: companies.c.id,
      supervisor_id: supervisorC.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorC2 = await upsertSeedUser(
    {
      role: UserRole.VENDEDOR,
      full_name: 'Vendedor C 2',
      cpf: '90000000034',
      email: null,
      phone: '555191700304',
      company_id: companies.c.id,
      supervisor_id: supervisorC.id,
      withPassword: false,
    },
    passwordHash,
  );

  const vendorConversations: SeedVendorConversation[] = [
    { user: supervisorA1, supervisorName: supervisorA1.full_name },
    { user: supervisorA2, supervisorName: supervisorA2.full_name },
    { user: supervisorB, supervisorName: supervisorB.full_name },
    { user: supervisorC, supervisorName: supervisorC.full_name },
    { user: vendorA1, supervisorName: supervisorA1.full_name },
    { user: vendorA2, supervisorName: supervisorA1.full_name },
    { user: vendorA3, supervisorName: supervisorA2.full_name },
    { user: vendorB1, supervisorName: supervisorB.full_name },
    { user: vendorB2, supervisorName: supervisorB.full_name },
    { user: vendorC1, supervisorName: supervisorC.full_name },
    { user: vendorC2, supervisorName: supervisorC.full_name },
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
    new Set(vendors.map((entry) => entry.user.company_id).filter((value): value is string => Boolean(value))),
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
    if (!entry.user.company_id) {
      continue;
    }

    const companyProducts = productsByCompany.get(entry.user.company_id) ?? [];
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
              id: createUuidV7(),
              timestamp_iso: timestamp,
              data: timestamp,
              msg_type: 'text',
              flow_name: SEED_FLOW_NAME,
              execution_id: `seed-exec-${entry.user.id}-${clientIndex}-${interactionRound}-${turnIndex}`,
              message_id: `seed-msg-${entry.user.id}-${clientIndex}-${interactionRound}-${turnIndex}`,
              mensagem: `Interacao ${interactionRound + 1}.${turnIndex + 1}: cliente pediu orientacao sobre ${turnProduct.nome}.`,
              resposta: `Sugestao enviada para ${turnProduct.nome}. Codigo interno: ${turnProduct.codigo_interno_sku ?? 'N/A'}.`,
              vendedor_nome: entry.user.full_name,
              vendedor_telefone: entry.user.phone,
              supervisor: entry.supervisorName,
              cliente_nome: clientName,
              user_id: entry.user.id,
              company_id: entry.user.company_id,
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
                id: createUuidV7(),
                historico_id: created.id,
                produto_id: citedProduct.id,
                company_id: entry.user.company_id,
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

async function seedLocatedClients(seededUsers: SeedUsersBundle): Promise<SeedLocatedClientsSummary> {
  const supervisorsByName = new Map<string, SeededUser>([
    [seededUsers.supervisorA1.full_name, seededUsers.supervisorA1],
    [seededUsers.supervisorA2.full_name, seededUsers.supervisorA2],
    [seededUsers.supervisorB.full_name, seededUsers.supervisorB],
    [seededUsers.supervisorC.full_name, seededUsers.supervisorC],
  ]);

  const locations = [
    { city: 'Sao Paulo', state: 'SP', addressBase: 'Rua das Flores' },
    { city: 'Campinas', state: 'SP', addressBase: 'Avenida Central' },
    { city: 'Porto Alegre', state: 'RS', addressBase: 'Rua Bento Goncalves' },
    { city: 'Curitiba', state: 'PR', addressBase: 'Rua XV de Novembro' },
    { city: 'Belo Horizonte', state: 'MG', addressBase: 'Avenida Amazonas' },
    { city: 'Florianopolis', state: 'SC', addressBase: 'Rua Beira Mar' },
  ] as const;

  const vendorEntries = seededUsers.vendorConversations.filter(
    (entry) => entry.user.role === UserRole.VENDEDOR && Boolean(entry.user.company_id),
  );

  const now = new Date();
  let inserted = 0;
  let visited = 0;
  let pending_visit = 0;

  for (let vendorIndex = 0; vendorIndex < vendorEntries.length; vendorIndex += 1) {
    const vendorEntry = vendorEntries[vendorIndex];
    const vendor = vendorEntry.user;
    const company_id = vendor.company_id;
    if (!company_id) {
      continue;
    }

    const supervisor = supervisorsByName.get(vendorEntry.supervisorName) ?? null;
    const sellerPhone = normalizePhone(vendor.phone);

    for (let clientIndex = 0; clientIndex < 2; clientIndex += 1) {
      const location = locations[(vendorIndex + clientIndex) % locations.length];
      const addressNumber = 120 + vendorIndex * 7 + clientIndex;
      const customerName = `${SEED_LOCATED_CLIENT_NAME_PREFIX} ${vendorIndex + 1}-${clientIndex + 1}`;

      const identified_at = new Date(now);
      identified_at.setDate(identified_at.getDate() - (vendorIndex * 2 + clientIndex + 1));
      identified_at.setHours(8 + ((vendorIndex + clientIndex) % 8), 15, 0, 0);

      const markAsVisited = (vendorIndex + clientIndex) % 3 !== 0;
      const visited_at = markAsVisited
        ? new Date(identified_at.getTime() + 2 * 60 * 60 * 1000)
        : null;

      const mapQuery = encodeURIComponent(
        `${location.addressBase}, ${addressNumber}, ${location.city} - ${location.state}`,
      );

      await prisma.locatedClient.create({
        data: {
          id: createUuidV7(),
          company_id,
          identified_by_user_id: vendor.id,
          source_seller_phone: sellerPhone,
          customer_name: customerName,
          city: location.city,
          state: location.state,
          address: `${location.addressBase}, ${addressNumber}`,
          map_url: `https://maps.google.com/?q=${mapQuery}`,
          identified_at,
          status: markAsVisited ? LocatedClientStatus.VISITADO : LocatedClientStatus.PENDENTE_VISITA,
          visited_at,
          visited_by_user_id: markAsVisited ? (supervisor?.id ?? vendor.id) : null,
        },
      });

      inserted += 1;
      if (markAsVisited) {
        visited += 1;
      } else {
        pending_visit += 1;
      }
    }
  }

  return {
    inserted,
    visited,
    pending_visit,
  };
}

async function main() {
  const companies = await upsertSeedCompanies();
  await upsertSeedProducts(companies);
  const seededUsers = await seedUsers(companies);
  const seededHistory = await seedConversationHistory(seededUsers.vendorConversations);
  const seededLocatedClients = await seedLocatedClients(seededUsers);

  const totalUsers = await prisma.user.count({
    where: {
      deleted_at: null,
    },
  });

  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    where: {
      deleted_at: null,
    },
    _count: {
      _all: true,
    },
  });

  const totalCompanies = await prisma.company.count({
    where: {
      deleted_at: null,
    },
  });

  const totalProducts = await prisma.produtos.count();
  const totalHistory = await prisma.historico_conversas.count();
  const totalCitations = await prisma.historico_conversas_produtos.count();
  const totalLocatedClients = await prisma.locatedClient.count({
    where: {
      deleted_at: null,
    },
  });

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
        seededLocatedClients,
        totals: {
          companies: totalCompanies,
          products: totalProducts,
          users: totalUsers,
          usersByRole,
          history: totalHistory,
          citations: totalCitations,
          located_clients: totalLocatedClients,
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

