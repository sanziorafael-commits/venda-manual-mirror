import { UserRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type {
  CreateUserByCompanyInput,
  CreateUserInput,
  PublicUserViewInput,
  UpdateUserInput,
  UserListInput,
} from '../types/user.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { normalizeCpf, normalizeEmail, normalizePhone } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';
import { hashPassword } from '../utils/password.js';
import {
  assertActorCompanyScope,
  canReadUserForContext,
  getUserRoleScopeWhere,
  resolveActorCompanyScope,
} from '../utils/rbac-scope-policy.js';
import {
  canCreateRole,
  canManageRole,
  isInvitableRole,
  isRoleWithDashboardAccess,
} from '../utils/user-role-policy.js';

import { createActivationInviteForUser } from './account-activation.service.js';

export async function listUsers(actor: AuthActor, input: UserListInput) {
  const pagination = getPagination(input.page, input.pageSize);
  const companyId = resolveActorCompanyScope(actor, input.companyId);
  const roleScopeWhere = getUserRoleScopeWhere(actor, 'users');

  const where = {
    deletedAt: null,
    ...(companyId ? { companyId } : {}),
    ...roleScopeWhere,
    ...(input.q
      ? {
          OR: [
            { fullName: { contains: input.q, mode: 'insensitive' as const } },
            { email: { contains: input.q, mode: 'insensitive' as const } },
            { cpf: { contains: normalizeCpf(input.q) } },
            { phone: { contains: normalizePhone(input.q) } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: 'desc' },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map((user) => mapPublicUser(user)),
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
    },
  };
}

export async function getUserById(actor: AuthActor, userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, user.companyId);
  if (
    !canReadUserForContext(
      actor,
      {
        id: user.id,
        role: user.role,
        companyId: user.companyId,
      },
      'users',
    )
  ) {
    throw forbidden('Voce nao tem permissao para visualizar este cargo');
  }
  return mapPublicUser(user);
}

export async function createUser(actor: AuthActor, input: CreateUserInput) {
  const companyId = resolveActorCompanyScope(actor, input.companyId);
  validateCreatePermissions(actor, input.role);
  validateCompanyForRole(input.role, companyId);
  validateCredentialsForRole(input.role, input.email, input.password);

  await assertCompanyExistsIfRequired(companyId);

  const user = await prisma.user.create({
    data: {
      companyId,
      role: input.role,
      fullName: input.fullName.trim(),
      cpf: normalizeCpf(input.cpf),
      email: input.email ? normalizeEmail(input.email) : null,
      phone: normalizePhone(input.phone),
      passwordHash: input.password ? await hashPassword(input.password) : null,
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
  });

  if (isInvitableRole(user.role) && !user.passwordHash) {
    await createActivationInviteForUser(user.id);
  }

  return mapPublicUser(user);
}

export async function createUserForCompany(
  actor: AuthActor,
  companyId: string,
  input: CreateUserByCompanyInput,
) {
  return createUser(actor, {
    ...input,
    companyId,
  });
}

export async function updateUser(actor: AuthActor, userId: string, input: UpdateUserInput) {
  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, existing.companyId);
  validateUpdatePermissions(actor, existing.role, input.role);

  const nextRole = input.role ?? existing.role;
  const nextEmail = input.email === undefined ? existing.email : input.email;
  const hasNewPassword = Boolean(input.password);

  if (hasNewPassword && nextRole !== UserRole.ADMIN) {
    throw badRequest('Somente admin pode ter senha definida diretamente por cadastro/edicao');
  }

  if (isRoleWithDashboardAccess(nextRole) && !nextEmail) {
    throw badRequest('Email obrigatório para cargos com acesso ao dashboard');
  }

  if (nextRole === UserRole.ADMIN && !existing.passwordHash && !hasNewPassword) {
    throw badRequest('Senha obrigatória para admin');
  }

  const companyId = resolveActorCompanyScope(actor, input.companyId ?? existing.companyId ?? undefined);
  validateCompanyForRole(nextRole, companyId);
  await assertCompanyExistsIfRequired(companyId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      companyId,
      role: nextRole,
      fullName: input.fullName?.trim(),
      cpf: input.cpf ? normalizeCpf(input.cpf) : undefined,
      email:
        input.email === undefined ? undefined : input.email ? normalizeEmail(input.email) : null,
      phone: input.phone ? normalizePhone(input.phone) : undefined,
      passwordHash:
        nextRole === UserRole.VENDEDOR
          ? null
          : hasNewPassword
            ? await hashPassword(input.password!)
            : undefined,
      isActive: input.isActive,
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
  });

  if (shouldResendActivationInvite(existing, user)) {
    await createActivationInviteForUser(user.id);
  }

  return mapPublicUser(user);
}

export async function deleteUser(actor: AuthActor, userId: string) {
  if (actor.userId === userId) {
    throw badRequest('Você não pode excluir o próprio usuário');
  }

  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, existing.companyId);

  if (!canManageRole(actor.role, existing.role)) {
    throw forbidden('Você não tem permissão para excluir este cargo');
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: now,
        isActive: false,
      },
    }),
    prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    }),
    prisma.accountActivationToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    }),
    prisma.userDeletionAudit.create({
      data: {
        targetUserId: userId,
        targetCompanyId: existing.companyId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        deletedAt: now,
      },
    }),
  ]);
}

function validateCreatePermissions(actor: AuthActor, role: UserRole) {
  if (!canCreateRole(actor.role, role)) {
    throw forbidden('Você não tem permissão para criar este cargo');
  }
}

function validateUpdatePermissions(actor: AuthActor, existingRole: UserRole, nextRole?: UserRole) {
  if (!canManageRole(actor.role, existingRole)) {
    throw forbidden('Você não tem permissão para editar este cargo');
  }

  if (nextRole && !canCreateRole(actor.role, nextRole)) {
    throw forbidden('Você não tem permissão para definir este cargo');
  }
}

function validateCredentialsForRole(role: UserRole, email?: string, password?: string) {
  if (role === UserRole.VENDEDOR) {
    if (password) {
      throw badRequest('Vendedor não deve possuir senha');
    }

    return;
  }

  if (!email) {
    throw badRequest('Email obrigatório para cargos com acesso ao dashboard');
  }

  if (isInvitableRole(role) && password) {
    throw badRequest('Gerente comercial e supervisor devem ativar senha via convite');
  }

  if (role === UserRole.ADMIN && !password) {
    throw badRequest('Senha obrigatória para admin');
  }
}

function validateCompanyForRole(role: UserRole, companyId: string | null) {
  if (role === UserRole.ADMIN && companyId) {
    throw badRequest('Admin não deve estar vinculado a empresa');
  }

  if (role !== UserRole.ADMIN && !companyId) {
    throw badRequest('companyId obrigatório para cargos não-admin');
  }
}

async function assertCompanyExistsIfRequired(companyId: string | null) {
  if (!companyId) {
    return;
  }

  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!company) {
    throw notFound('Empresa não encontrada');
  }
}

function shouldResendActivationInvite(
  existing: { role: UserRole; email: string | null; passwordHash: string | null },
  updated: { role: UserRole; email: string | null; passwordHash: string | null },
) {
  if (!isInvitableRole(updated.role) || updated.passwordHash) {
    return false;
  }

  return existing.role !== updated.role || existing.email !== updated.email;
}

function mapPublicUser(user: PublicUserViewInput) {
  return {
    id: user.id,
    companyId: user.companyId,
    company: user.company ?? null,
    role: user.role,
    fullName: user.fullName,
    cpf: user.cpf,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    passwordStatus:
      user.role === UserRole.VENDEDOR ? 'NOT_APPLICABLE' : user.passwordHash ? 'SET' : 'PENDING',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
