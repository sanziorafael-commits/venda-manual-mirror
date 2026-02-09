import { UserRole, type Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import type {
  CreateUserByCompanyInput,
  CreateUserInput,
  PublicUserViewInput,
  ReassignManagerTeamInput,
  ReassignSupervisorInput,
  UpdateUserInput,
  UserListInput,
} from '../types/user.types.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/app-error.js';
import { normalizeCpf, normalizeEmail, normalizePhone } from '../utils/normalizers.js';
import { getPagination } from '../utils/pagination.js';
import { hashPassword } from '../utils/password.js';
import {
  assertActorCompanyScope,
  getUserReadScopeWhere,
  resolveActorCompanyScope,
} from '../utils/rbac-scope-policy.js';
import {
  canCreateRole,
  canManageRole,
  isInvitableRole,
  isRoleWithDashboardAccess,
} from '../utils/user-role-policy.js';

import { createActivationInviteForUser } from './account-activation.service.js';

type ScopedTargetUser = {
  id: string;
  role: UserRole;
  companyId: string | null;
  managerId: string | null;
  supervisorId: string | null;
  supervisor: { id: string; managerId: string | null } | null;
};

type ResolvedHierarchy = {
  managerId: string | null;
  supervisorId: string | null;
};

export async function listUsers(actor: AuthActor, input: UserListInput) {
  const pagination = getPagination(input.page, input.pageSize);
  const companyId = resolveActorCompanyScope(actor, input.companyId);
  const roleScopeWhere = getUserReadScopeWhere(actor, 'users');

  const andFilters: Prisma.UserWhereInput[] = [{ deletedAt: null }];

  if (companyId) {
    andFilters.push({ companyId });
  }

  if (Object.keys(roleScopeWhere).length > 0) {
    andFilters.push(roleScopeWhere);
  }

  if (input.q) {
    andFilters.push({
      OR: [
        { fullName: { contains: input.q, mode: 'insensitive' as const } },
        { email: { contains: input.q, mode: 'insensitive' as const } },
        { cpf: { contains: normalizeCpf(input.q) } },
        { phone: { contains: normalizePhone(input.q) } },
      ],
    });
  }

  if (input.role) {
    andFilters.push({ role: input.role });
  }

  if (input.managerId) {
    andFilters.push({ managerId: input.managerId });
  }

  if (input.supervisorId) {
    andFilters.push({ supervisorId: input.supervisorId });
  }

  if (input.isActive !== undefined) {
    andFilters.push({ isActive: input.isActive });
  }

  const where: Prisma.UserWhereInput = {
    AND: andFilters,
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
        manager: {
          select: { id: true, fullName: true },
        },
        supervisor: {
          select: { id: true, fullName: true },
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
      manager: {
        select: { id: true, fullName: true },
      },
      supervisor: {
        select: { id: true, fullName: true, managerId: true },
      },
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, user.companyId);
  if (!canReadUserByHierarchy(actor, user)) {
    throw forbidden('Você não tem permissão para visualizar este usuário');
  }

  return mapPublicUser(user);
}

export async function createUser(actor: AuthActor, input: CreateUserInput) {
  const companyId = resolveActorCompanyScope(actor, input.companyId);
  validateCreatePermissions(actor, input.role);
  validateCompanyForRole(input.role, companyId);
  validateCredentialsForRole(input.role, input.email, input.password);

  await assertCompanyExistsIfRequired(companyId);

  const hierarchy = await resolveHierarchyForCreate(actor, {
    role: input.role,
    companyId,
    managerId: input.managerId,
    supervisorId: input.supervisorId,
  });

  const user = await prisma.user.create({
    data: {
      companyId,
      role: input.role,
      managerId: hierarchy.managerId,
      supervisorId: hierarchy.supervisorId,
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
      manager: {
        select: { id: true, fullName: true },
      },
      supervisor: {
        select: { id: true, fullName: true },
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
    include: {
      supervisor: {
        select: { id: true, managerId: true },
      },
    },
  });

  if (!existing) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, existing.companyId);
  assertManageScope(actor, existing);
  validateUpdatePermissions(actor, existing.role, input.role);

  const nextRole = input.role ?? existing.role;
  const nextEmail = input.email === undefined ? existing.email : input.email;
  const hasNewPassword = Boolean(input.password);

  if (hasNewPassword && nextRole !== UserRole.ADMIN) {
    throw badRequest('Somente admin pode ter senha definida diretamente por cadastro ou edição');
  }

  if (isRoleWithDashboardAccess(nextRole) && !nextEmail) {
    throw badRequest('Email obrigatório para cargos com acesso ao dashboard');
  }

  if (nextRole === UserRole.ADMIN && !existing.passwordHash && !hasNewPassword) {
    throw badRequest('Senha obrigatória para admin');
  }

  const companyId = resolveActorCompanyScope(
    actor,
    input.companyId ?? existing.companyId ?? undefined,
  );
  validateCompanyForRole(nextRole, companyId);
  await assertCompanyExistsIfRequired(companyId);

  const hierarchy = await resolveHierarchyForUpdate(actor, {
    existing,
    nextRole,
    companyId,
    managerId: input.managerId,
    supervisorId: input.supervisorId,
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      companyId,
      role: nextRole,
      managerId: hierarchy.managerId,
      supervisorId: hierarchy.supervisorId,
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
      manager: {
        select: { id: true, fullName: true },
      },
      supervisor: {
        select: { id: true, fullName: true },
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
    include: {
      supervisor: {
        select: { id: true, managerId: true },
      },
    },
  });

  if (!existing) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, existing.companyId);
  assertManageScope(actor, existing);

  if (existing.role === UserRole.SUPERVISOR) {
    const activeVendorsCount = await prisma.user.count({
      where: {
        deletedAt: null,
        isActive: true,
        role: UserRole.VENDEDOR,
        supervisorId: existing.id,
      },
    });

    if (activeVendorsCount > 0) {
      throw conflict('Supervisor possui vendedores ativos vinculados', {
        activeVendorsCount,
      });
    }
  }

  if (existing.role === UserRole.GERENTE_COMERCIAL) {
    const activeSupervisorsCount = await prisma.user.count({
      where: {
        deletedAt: null,
        isActive: true,
        role: UserRole.SUPERVISOR,
        managerId: existing.id,
      },
    });

    if (activeSupervisorsCount > 0) {
      throw conflict('Gerente comercial possui supervisores ativos vinculados', {
        activeSupervisorsCount,
      });
    }
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

export async function reassignSupervisor(actor: AuthActor, input: ReassignSupervisorInput) {
  if (input.fromSupervisorId === input.toSupervisorId) {
    throw badRequest('Supervisor de origem e destino não podem ser iguais');
  }

  const [fromSupervisor, toSupervisor] = await Promise.all([
    getSupervisorForReassign(input.fromSupervisorId),
    getSupervisorForReassign(input.toSupervisorId),
  ]);

  if (fromSupervisor.companyId !== toSupervisor.companyId) {
    throw badRequest('Supervisores devem pertencer à mesma empresa');
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    if (!actor.companyId || actor.companyId !== fromSupervisor.companyId) {
      throw forbidden('Você não tem acesso ao escopo desta empresa');
    }

    if (fromSupervisor.managerId !== actor.userId || toSupervisor.managerId !== actor.userId) {
      throw forbidden('Você só pode reatribuir vendedores entre supervisores do seu escopo');
    }
  }

  const moved = await prisma.user.updateMany({
    where: {
      role: UserRole.VENDEDOR,
      deletedAt: null,
      supervisorId: fromSupervisor.id,
    },
    data: {
      supervisorId: toSupervisor.id,
    },
  });

  return {
    fromSupervisorId: fromSupervisor.id,
    toSupervisorId: toSupervisor.id,
    companyId: fromSupervisor.companyId,
    movedVendors: moved.count,
  };
}

export async function reassignManagerTeam(actor: AuthActor, input: ReassignManagerTeamInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw forbidden('Somente admin pode reatribuir equipes entre gerentes');
  }

  if (input.fromManagerId === input.toManagerId) {
    throw badRequest('Gerente de origem e destino não podem ser iguais');
  }

  const [fromManager, toManager] = await Promise.all([
    getManagerForReassign(input.fromManagerId),
    getManagerForReassign(input.toManagerId),
  ]);

  if (fromManager.companyId !== toManager.companyId) {
    throw badRequest('Gerentes devem pertencer à mesma empresa');
  }

  const result = await prisma.$transaction(async (tx) => {
    const vendorsImpacted = await tx.user.count({
      where: {
        role: UserRole.VENDEDOR,
        deletedAt: null,
        supervisor: {
          is: {
            deletedAt: null,
            role: UserRole.SUPERVISOR,
            managerId: fromManager.id,
          },
        },
      },
    });

    const supervisorsMoved = await tx.user.updateMany({
      where: {
        role: UserRole.SUPERVISOR,
        deletedAt: null,
        managerId: fromManager.id,
      },
      data: {
        managerId: toManager.id,
      },
    });

    return {
      supervisorsMoved: supervisorsMoved.count,
      vendorsImpacted,
    };
  });

  return {
    fromManagerId: fromManager.id,
    toManagerId: toManager.id,
    companyId: fromManager.companyId,
    supervisorsMoved: result.supervisorsMoved,
    vendorsImpacted: result.vendorsImpacted,
  };
}

function canReadUserByHierarchy(actor: AuthActor, target: ScopedTargetUser) {
  if (actor.role === UserRole.ADMIN) {
    return true;
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    if (target.role === UserRole.SUPERVISOR) {
      return target.managerId === actor.userId;
    }

    if (target.role === UserRole.VENDEDOR) {
      return target.supervisor?.managerId === actor.userId;
    }

    return false;
  }

  if (actor.role === UserRole.SUPERVISOR) {
    return target.role === UserRole.VENDEDOR && target.supervisorId === actor.userId;
  }

  return false;
}

function assertManageScope(actor: AuthActor, target: ScopedTargetUser) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!canManageRole(actor.role, target.role)) {
    throw forbidden('Você não tem permissão para editar este cargo');
  }

  if (!canReadUserByHierarchy(actor, target)) {
    throw forbidden('Você não tem permissão para operar este usuário');
  }
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
    throw badRequest('Admin não deve estar vinculado à empresa');
  }

  if (role !== UserRole.ADMIN && !companyId) {
    throw badRequest('companyId obrigatório para cargos não-admin');
  }
}

async function resolveHierarchyForCreate(
  actor: AuthActor,
  input: {
    role: UserRole;
    companyId: string | null;
    managerId?: string | null;
    supervisorId?: string | null;
  },
): Promise<ResolvedHierarchy> {
  if (input.role === UserRole.ADMIN || input.role === UserRole.GERENTE_COMERCIAL) {
    if (input.managerId || input.supervisorId) {
      throw badRequest('managerId e supervisorId não são permitidos para este cargo');
    }

    return {
      managerId: null,
      supervisorId: null,
    };
  }

  if (input.role === UserRole.SUPERVISOR) {
    if (input.supervisorId) {
      throw badRequest('supervisorId não é permitido para cargo SUPERVISOR');
    }

    if (actor.role === UserRole.GERENTE_COMERCIAL) {
      if (input.managerId && input.managerId !== actor.userId) {
        throw forbidden('Gerente só pode vincular supervisor a si mesmo');
      }

      return {
        managerId: actor.userId,
        supervisorId: null,
      };
    }

    const managerId = input.managerId;
    if (!managerId || !input.companyId) {
      throw badRequest('managerId obrigatório para criar SUPERVISOR');
    }

    await assertManagerLink(managerId, input.companyId);
    return {
      managerId,
      supervisorId: null,
    };
  }

  if (input.managerId) {
    throw badRequest('managerId não é permitido para cargo VENDEDOR');
  }

  if (actor.role === UserRole.SUPERVISOR) {
    if (input.supervisorId && input.supervisorId !== actor.userId) {
      throw forbidden('Supervisor só pode vincular vendedor a si mesmo');
    }

    return {
      managerId: null,
      supervisorId: actor.userId,
    };
  }

  const supervisorId = input.supervisorId;
  if (!supervisorId || !input.companyId) {
    throw badRequest('supervisorId obrigatório para criar VENDEDOR');
  }

  const supervisor = await assertSupervisorLink(supervisorId, input.companyId);
  if (actor.role === UserRole.GERENTE_COMERCIAL && supervisor.managerId !== actor.userId) {
    throw forbidden('Você só pode vincular vendedores a supervisores do seu escopo');
  }

  return {
    managerId: null,
    supervisorId,
  };
}

async function resolveHierarchyForUpdate(
  actor: AuthActor,
  input: {
    existing: {
      role: UserRole;
      managerId: string | null;
      supervisorId: string | null;
      companyId: string | null;
      supervisor: { id: string; managerId: string | null } | null;
    };
    nextRole: UserRole;
    companyId: string | null;
    managerId?: string | null;
    supervisorId?: string | null;
  },
): Promise<ResolvedHierarchy> {
  const { existing, nextRole, companyId } = input;

  if (nextRole === UserRole.ADMIN || nextRole === UserRole.GERENTE_COMERCIAL) {
    if (input.managerId || input.supervisorId) {
      throw badRequest('managerId e supervisorId não são permitidos para este cargo');
    }

    return {
      managerId: null,
      supervisorId: null,
    };
  }

  if (nextRole === UserRole.SUPERVISOR) {
    if (input.supervisorId) {
      throw badRequest('supervisorId não é permitido para cargo SUPERVISOR');
    }

    if (!companyId) {
      throw badRequest('companyId obrigatório para SUPERVISOR');
    }

    if (actor.role === UserRole.GERENTE_COMERCIAL) {
      if (input.managerId !== undefined && input.managerId !== actor.userId) {
        throw forbidden('Gerente só pode vincular supervisor a si mesmo');
      }

      return {
        managerId: actor.userId,
        supervisorId: null,
      };
    }

    const managerId = input.managerId === undefined ? existing.managerId : input.managerId;
    if (!managerId) {
      throw badRequest('managerId obrigatório para cargo SUPERVISOR');
    }

    await assertManagerLink(managerId, companyId);
    return {
      managerId,
      supervisorId: null,
    };
  }

  if (!companyId) {
    throw badRequest('companyId obrigatório para VENDEDOR');
  }

  if (input.managerId) {
    throw badRequest('managerId não é permitido para cargo VENDEDOR');
  }

  if (actor.role === UserRole.SUPERVISOR) {
    if (input.supervisorId !== undefined && input.supervisorId !== actor.userId) {
      throw forbidden('Supervisor não pode mover vendedor para outro supervisor');
    }

    return {
      managerId: null,
      supervisorId: actor.userId,
    };
  }

  const supervisorId =
    input.supervisorId === undefined ? existing.supervisorId : input.supervisorId;
  if (!supervisorId) {
    throw badRequest('supervisorId obrigatório para cargo VENDEDOR');
  }

  const supervisor = await assertSupervisorLink(supervisorId, companyId);
  if (actor.role === UserRole.GERENTE_COMERCIAL && supervisor.managerId !== actor.userId) {
    throw forbidden('Você só pode vincular vendedor a supervisores do seu escopo');
  }

  return {
    managerId: null,
    supervisorId,
  };
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

async function assertManagerLink(managerId: string, companyId: string) {
  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      role: UserRole.GERENTE_COMERCIAL,
      companyId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!manager) {
    throw badRequest('Gerente comercial inválido para esta empresa');
  }
}

async function assertSupervisorLink(supervisorId: string, companyId: string) {
  const supervisor = await prisma.user.findFirst({
    where: {
      id: supervisorId,
      role: UserRole.SUPERVISOR,
      companyId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      managerId: true,
    },
  });

  if (!supervisor) {
    throw badRequest('Supervisor inválido para esta empresa');
  }

  return supervisor;
}

async function getSupervisorForReassign(supervisorId: string) {
  const supervisor = await prisma.user.findFirst({
    where: {
      id: supervisorId,
      role: UserRole.SUPERVISOR,
      deletedAt: null,
    },
    select: {
      id: true,
      companyId: true,
      managerId: true,
    },
  });

  if (!supervisor || !supervisor.companyId) {
    throw badRequest('Supervisor de origem ou destino inválido');
  }

  return supervisor;
}

async function getManagerForReassign(managerId: string) {
  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      role: UserRole.GERENTE_COMERCIAL,
      deletedAt: null,
    },
    select: {
      id: true,
      companyId: true,
    },
  });

  if (!manager || !manager.companyId) {
    throw badRequest('Gerente comercial de origem ou destino inválido');
  }

  return manager;
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
    managerId: user.managerId ?? null,
    manager: user.manager ?? null,
    supervisorId: user.supervisorId ?? null,
    supervisor: user.supervisor ?? null,
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
