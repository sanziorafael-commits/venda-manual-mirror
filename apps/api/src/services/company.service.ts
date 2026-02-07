import { prisma } from '../lib/prisma.js';
import type { CompanyListInput, CreateCompanyInput, UpdateCompanyInput } from '../types/company.types.js';
import { conflict, notFound } from '../utils/app-error.js';
import { normalizeCnpj } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';

export async function listCompanies(input: CompanyListInput) {
  const pagination = getPagination(input.page, input.pageSize);

  const where = {
    deletedAt: null,
    ...(input.q
      ? {
          name: {
            contains: input.q,
            mode: 'insensitive' as const,
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    }),
    prisma.company.count({ where }),
  ]);

  return {
    items: items.map((company) => ({
      id: company.id,
      name: company.name,
      cnpj: company.cnpj,
      logoUrl: company.logoUrl,
      usersCount: company._count.users,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    })),
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  };
}

export async function getCompanyById(companyId: string) {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: { users: { where: { deletedAt: null } } },
      },
    },
  });

  if (!company) {
    throw notFound('Empresa nao encontrada');
  }

  return {
    id: company.id,
    name: company.name,
    cnpj: company.cnpj,
    logoUrl: company.logoUrl,
    usersCount: company._count.users,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export async function createCompany(input: CreateCompanyInput) {
  const company = await prisma.company.create({
    data: {
      name: input.name.trim(),
      cnpj: normalizeCnpj(input.cnpj),
      logoUrl: input.logoUrl,
    },
  });

  return company;
}

export async function updateCompany(companyId: string, input: UpdateCompanyInput) {
  await getCompanyById(companyId);

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: input.name?.trim(),
      cnpj: input.cnpj ? normalizeCnpj(input.cnpj) : undefined,
      logoUrl: input.logoUrl,
    },
  });

  return company;
}

export async function deleteCompany(companyId: string) {
  await getCompanyById(companyId);

  const activeUsersCount = await prisma.user.count({
    where: {
      companyId,
      deletedAt: null,
      isActive: true,
    },
  });

  if (activeUsersCount > 0) {
    throw conflict('Nao e possivel excluir empresa com usuarios ativos vinculados', {
      activeUsersCount,
    });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      deletedAt: new Date(),
    },
  });
}
