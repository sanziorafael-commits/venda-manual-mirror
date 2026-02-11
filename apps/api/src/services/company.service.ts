import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import type {
  CompanyListInput,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../types/company.types.js';
import { conflict, notFound } from '../utils/app-error.js';
import { normalizeCnpj } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';

import {
  createStorageSignedReadUrlByPublicUrl,
  deleteStorageObjectByPublicUrl,
} from './storage.service.js';

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
    throw notFound('Empresa não encontrada');
  }

  let logoSignedUrl: string | null = null;
  if (company.logoUrl) {
    try {
      const signedReadUrl = await createStorageSignedReadUrlByPublicUrl(company.logoUrl);
      logoSignedUrl = signedReadUrl?.readUrl ?? null;
    } catch (error) {
      logger.warn(
        { err: error, companyId, logoUrl: company.logoUrl },
        'failed to create signed read url for company logo',
      );
    }
  }

  return {
    id: company.id,
    name: company.name,
    cnpj: company.cnpj,
    logoUrl: company.logoUrl,
    logoSignedUrl,
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
  const existing = await getCompanyById(companyId);

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: input.name?.trim(),
      cnpj: input.cnpj ? normalizeCnpj(input.cnpj) : undefined,
      logoUrl: input.logoUrl,
    },
  });

  if (
    input.logoUrl !== undefined &&
    existing.logoUrl &&
    existing.logoUrl !== company.logoUrl
  ) {
    try {
      await deleteStorageObjectByPublicUrl(existing.logoUrl);
    } catch (error) {
      logger.warn(
        { err: error, companyId, previousLogoUrl: existing.logoUrl },
        'failed to delete previous company logo from storage',
      );
    }
  }

  return company;
}

export async function deleteCompany(companyId: string) {
  const company = await getCompanyById(companyId);

  const activeUsersCount = await prisma.user.count({
    where: {
      companyId,
      deletedAt: null,
      isActive: true,
    },
  });

  if (activeUsersCount > 0) {
    throw conflict('Não é possível excluir empresa com usuários ativos vinculados', {
      activeUsersCount,
    });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      deletedAt: new Date(),
    },
  });

  if (company.logoUrl) {
    try {
      await deleteStorageObjectByPublicUrl(company.logoUrl);
    } catch (error) {
      logger.warn(
        { err: error, companyId, previousLogoUrl: company.logoUrl },
        'failed to delete company logo from storage after company deletion',
      );
    }
  }
}
