import { UserRole } from '@prisma/client';

import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type {
  CompanyListInput,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '../types/company.types.js';
import { conflict, forbidden, notFound } from '../utils/app-error.js';
import { normalizeCnpj } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';
import { createUuidV7 } from '../utils/uuid.js';

import {
  createStorageSignedReadUrlByPublicUrl,
  deleteStorageObjectByPublicUrl,
} from './storage.service.js';

export async function listCompanies(actor: AuthActor, input: CompanyListInput) {
  const pagination = getPagination(input.page, input.page_size);

  if (actor.role !== UserRole.ADMIN && !actor.company_id) {
    throw forbidden('Usuario nao vinculado a empresa');
  }

  const where = {
    deleted_at: null,
    ...(actor.role !== UserRole.ADMIN && actor.company_id
      ? {
          id: actor.company_id,
        }
      : {}),
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
      orderBy: { created_at: 'desc' },
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
      logo_url: company.logo_url,
      users_count: company._count.users,
      created_at: company.created_at,
      updated_at: company.updated_at,
    })),
    meta: {
      page: pagination.page,
      page_size: pagination.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / pagination.page_size)),
    },
  };
}

export async function getCompanyById(actor: AuthActor, company_id: string) {
  assertCompanyScope(actor, company_id);

  const company = await prisma.company.findFirst({
    where: {
      id: company_id,
      deleted_at: null,
    },
    include: {
      _count: {
        select: { users: { where: { deleted_at: null } } },
      },
    },
  });

  if (!company) {
    throw notFound('Empresa não encontrada');
  }

  let logo_signed_url: string | null = null;
  if (company.logo_url) {
    try {
      const signedReadUrl = await createStorageSignedReadUrlByPublicUrl(company.logo_url);
      logo_signed_url = signedReadUrl?.readUrl ?? null;
    } catch (error) {
      logger.warn(
        { err: error, company_id, logo_url: company.logo_url },
        'failed to create signed read url for company logo',
      );
    }
  }

  return {
    id: company.id,
    name: company.name,
    cnpj: company.cnpj,
    logo_url: company.logo_url,
    logo_signed_url,
    users_count: company._count.users,
    created_at: company.created_at,
    updated_at: company.updated_at,
  };
}

export async function createCompany(input: CreateCompanyInput) {
  const company = await prisma.company.create({
    data: {
      id: createUuidV7(),
      name: input.name.trim(),
      cnpj: normalizeCnpj(input.cnpj),
      logo_url: input.logo_url,
    },
  });

  return company;
}

export async function updateCompany(
  actor: AuthActor,
  company_id: string,
  input: UpdateCompanyInput,
) {
  const existing = await getCompanyById(actor, company_id);

  const company = await prisma.company.update({
    where: { id: company_id },
    data: {
      name: input.name?.trim(),
      cnpj: input.cnpj ? normalizeCnpj(input.cnpj) : undefined,
      logo_url: input.logo_url,
    },
  });

  if (
    input.logo_url !== undefined &&
    existing.logo_url &&
    existing.logo_url !== company.logo_url
  ) {
    try {
      await deleteStorageObjectByPublicUrl(existing.logo_url);
    } catch (error) {
      logger.warn(
        { err: error, company_id, previousLogoUrl: existing.logo_url },
        'failed to delete previous company logo from storage',
      );
    }
  }

  return company;
}

export async function deleteCompany(company_id: string) {
  const company = await prisma.company.findFirst({
    where: {
      id: company_id,
      deleted_at: null,
    },
    include: {
      _count: {
        select: { users: { where: { deleted_at: null } } },
      },
    },
  });

  if (!company) {
    throw notFound('Empresa nao encontrada');
  }

  const activeUsersCount = await prisma.user.count({
    where: {
      company_id,
      deleted_at: null,
      is_active: true,
    },
  });

  if (activeUsersCount > 0) {
    throw conflict('Não é possível excluir empresa com usuários ativos vinculados', {
      active_users_count: activeUsersCount,
    });
  }

  await prisma.company.update({
    where: { id: company_id },
    data: {
      deleted_at: new Date(),
    },
  });

  if (company.logo_url) {
    try {
      await deleteStorageObjectByPublicUrl(company.logo_url);
    } catch (error) {
      logger.warn(
        { err: error, company_id, previousLogoUrl: company.logo_url },
        'failed to delete company logo from storage after company deletion',
      );
    }
  }
}

function assertCompanyScope(actor: AuthActor, company_id: string) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!actor.company_id || actor.company_id !== company_id) {
    throw forbidden('Voce nao tem acesso ao escopo desta empresa');
  }
}


