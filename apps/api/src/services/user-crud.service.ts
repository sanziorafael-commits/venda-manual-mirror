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
import { isInvitableRole, isRoleWithDashboardAccess } from '../utils/user-role-policy.js';
import { createUuidV7 } from '../utils/uuid.js';

import { createActivationInviteForUser } from './account-activation.service.js';
import { linkConversationHistoryByPhone } from './historico-conversas-link.service.js';
import {
  assertCompanyExistsIfRequired,
  getManagerForReassign,
  getSupervisorForReassign,
  resolveHierarchyForCreate,
  resolveHierarchyForUpdate,
} from './user-hierarchy.service.js';
import { shouldResendActivationInvite } from './user-invitations.service.js';
import {
  assertManageScope,
  canReadUserByHierarchy,
  validateCompanyForRole,
  validateCreatePermissions,
  validateCredentialsForRole,
  validateUpdatePermissions,
} from './user-rbac.service.js';

export async function listUsers(actor: AuthActor, input: UserListInput) {
  const pagination = getPagination(input.page, input.page_size);
  const company_id = resolveActorCompanyScope(actor, input.company_id);
  const roleScopeWhere = getUserReadScopeWhere(actor, 'users');

  const andFilters: Prisma.UserWhereInput[] = [];

  if (company_id) {
    andFilters.push({ company_id });
  }

  if (Object.keys(roleScopeWhere).length > 0) {
    andFilters.push(roleScopeWhere);
  }

  if (input.q) {
    const normalizedCpfQuery = normalizeCpf(input.q);
    const normalizedPhoneQuery = normalizePhone(input.q);
    const queryFilters: Prisma.UserWhereInput[] = [
      { full_name: { contains: input.q, mode: 'insensitive' as const } },
      { email: { contains: input.q, mode: 'insensitive' as const } },
    ];

    if (normalizedCpfQuery.length > 0) {
      queryFilters.push({ cpf: { contains: normalizedCpfQuery } });
    }

    if (normalizedPhoneQuery.length > 0) {
      queryFilters.push({ phone: { contains: normalizedPhoneQuery } });
    }

    andFilters.push({
      OR: queryFilters,
    });
  }

  if (input.role) {
    andFilters.push({ role: input.role });
  }

  if (input.manager_id) {
    andFilters.push({ manager_id: input.manager_id });
  }

  if (input.supervisor_id) {
    andFilters.push({ supervisor_id: input.supervisor_id });
  }

  if (input.is_active !== undefined) {
    andFilters.push({ is_active: input.is_active });
  }

  const where: Prisma.UserWhereInput = {
    AND: andFilters,
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { created_at: 'desc' },
      include: {
        company: {
          select: { id: true, name: true },
        },
        manager: {
          select: { id: true, full_name: true },
        },
        supervisor: {
          select: { id: true, full_name: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map((user) => mapPublicUser(user)),
    meta: {
      page: pagination.page,
      page_size: pagination.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / pagination.page_size)),
    },
  };
}

export async function getUserById(actor: AuthActor, user_id: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: user_id,
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
      manager: {
        select: { id: true, full_name: true },
      },
      supervisor: {
        select: { id: true, full_name: true, manager_id: true },
      },
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, user.company_id);
  if (!canReadUserByHierarchy(actor, user)) {
    throw forbidden('Você não tem permissão para visualizar este usuário');
  }

  return mapPublicUser(user);
}

export async function createUser(actor: AuthActor, input: CreateUserInput) {
  const company_id = resolveActorCompanyScope(actor, input.company_id);
  validateCreatePermissions(actor, input.role);
  validateCompanyForRole(input.role, company_id);
  validateCredentialsForRole(input.role, input.email, input.password);

  await assertCompanyExistsIfRequired(company_id);

  const hierarchy = await resolveHierarchyForCreate(actor, {
    role: input.role,
    company_id,
    manager_id: input.manager_id,
    supervisor_id: input.supervisor_id,
  });

  const user = await prisma.user.create({
    data: {
      id: createUuidV7(),
      company_id,
      role: input.role,
      manager_id: hierarchy.manager_id,
      supervisor_id: hierarchy.supervisor_id,
      full_name: input.full_name.trim(),
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
        select: { id: true, full_name: true },
      },
      supervisor: {
        select: { id: true, full_name: true },
      },
    },
  });

  if (isInvitableRole(user.role) && !user.passwordHash) {
    await createActivationInviteForUser(user.id);
  }

  if (user.role === UserRole.VENDEDOR) {
    await linkConversationHistoryByPhone({
      user_id: user.id,
      company_id: user.company_id,
      phone: user.phone,
    });
  }

  return mapPublicUser(user);
}

export async function createUserForCompany(
  actor: AuthActor,
  company_id: string,
  input: CreateUserByCompanyInput,
) {
  return createUser(actor, {
    ...input,
    company_id,
  });
}

export async function updateUser(actor: AuthActor, user_id: string, input: UpdateUserInput) {
  const existing = await prisma.user.findFirst({
    where: {
      id: user_id,
    },
    include: {
      supervisor: {
        select: { id: true, manager_id: true },
      },
    },
  });

  if (!existing) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, existing.company_id);
  assertManageScope(actor, existing);
  validateUpdatePermissions(actor, existing.role, input.role);

  const nextRole = input.role ?? existing.role;
  const nextEmail = input.email === undefined ? existing.email : input.email;
  const hasNewPassword = Boolean(input.password);

  if (hasNewPassword && nextRole !== UserRole.ADMIN) {
    throw badRequest('Somente admin pode ter senha definida diretamente por cadastro ou edição');
  }

  if (isRoleWithDashboardAccess(nextRole) && !nextEmail) {
    throw badRequest('E-mail obrigatório para cargos com acesso ao dashboard');
  }

  if (nextRole === UserRole.ADMIN && !existing.passwordHash && !hasNewPassword) {
    throw badRequest('Senha obrigatória para admin');
  }

  const company_id = resolveActorCompanyScope(
    actor,
    input.company_id ?? existing.company_id ?? undefined,
  );
  validateCompanyForRole(nextRole, company_id);
  await assertCompanyExistsIfRequired(company_id);

  const hierarchy = await resolveHierarchyForUpdate(actor, {
    existing,
    nextRole,
    company_id,
    manager_id: input.manager_id,
    supervisor_id: input.supervisor_id,
  });

  const user = await prisma.user.update({
    where: { id: user_id },
    data: {
      company_id,
      role: nextRole,
      manager_id: hierarchy.manager_id,
      supervisor_id: hierarchy.supervisor_id,
      full_name: input.full_name?.trim(),
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
      is_active: input.is_active,
      deleted_at: input.is_active === true ? null : undefined,
    },
    include: {
      company: {
        select: { id: true, name: true },
      },
      manager: {
        select: { id: true, full_name: true },
      },
      supervisor: {
        select: { id: true, full_name: true },
      },
    },
  });

  if (shouldResendActivationInvite(existing, user)) {
    await createActivationInviteForUser(user.id);
  }

  if (user.role === UserRole.VENDEDOR) {
    await linkConversationHistoryByPhone({
      user_id: user.id,
      company_id: user.company_id,
      phone: user.phone,
    });
  }

  return mapPublicUser(user);
}

export async function deleteUser(actor: AuthActor, user_id: string) {
  if (actor.user_id === user_id) {
    throw badRequest('Você não pode excluir o próprio usuário');
  }

  const existing = await prisma.user.findFirst({
    where: {
      id: user_id,
      deleted_at: null,
    },
    include: {
      supervisor: {
        select: { id: true, manager_id: true },
      },
    },
  });

  if (!existing) {
    throw notFound('Usuário não encontrado');
  }

  assertActorCompanyScope(actor, existing.company_id);
  assertManageScope(actor, existing);

  if (existing.role === UserRole.SUPERVISOR) {
    const activeVendorsCount = await prisma.user.count({
      where: {
        deleted_at: null,
        is_active: true,
        role: UserRole.VENDEDOR,
        supervisor_id: existing.id,
      },
    });

    if (activeVendorsCount > 0) {
      throw conflict('Supervisor possui vendedores ativos vinculados', {
        active_vendors_count: activeVendorsCount,
      });
    }
  }

  if (existing.role === UserRole.GERENTE_COMERCIAL) {
    const activeSupervisorsCount = await prisma.user.count({
      where: {
        deleted_at: null,
        is_active: true,
        role: UserRole.SUPERVISOR,
        manager_id: existing.id,
      },
    });

    if (activeSupervisorsCount > 0) {
      throw conflict('Gerente comercial possui supervisores ativos vinculados', {
        active_supervisors_count: activeSupervisorsCount,
      });
    }
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user_id },
      data: {
        deleted_at: now,
        is_active: false,
      },
    }),
    prisma.session.updateMany({
      where: {
        user_id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    }),
    prisma.accountActivationToken.updateMany({
      where: {
        user_id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    }),
    prisma.userDeletionAudit.create({
      data: {
        id: createUuidV7(),
        targetUserId: user_id,
        targetCompanyId: existing.company_id,
        actorUserId: actor.user_id,
        actorRole: actor.role,
        deleted_at: now,
      },
    }),
  ]);
}

export async function reassignSupervisor(actor: AuthActor, input: ReassignSupervisorInput) {
  if (input.from_supervisor_id === input.to_supervisor_id) {
    throw badRequest('Supervisor de origem e destino não podem ser iguais');
  }

  const [fromSupervisor, toSupervisor] = await Promise.all([
    getSupervisorForReassign(input.from_supervisor_id),
    getSupervisorForReassign(input.to_supervisor_id),
  ]);

  if (fromSupervisor.company_id !== toSupervisor.company_id) {
    throw badRequest('Supervisores devem pertencer à mesma empresa');
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    if (!actor.company_id || actor.company_id !== fromSupervisor.company_id) {
      throw forbidden('Você não tem acesso ao escopo desta empresa');
    }

    if (fromSupervisor.manager_id !== actor.user_id || toSupervisor.manager_id !== actor.user_id) {
      throw forbidden('Você só pode reatribuir vendedores entre supervisores do seu escopo');
    }
  }

  const moved = await prisma.user.updateMany({
    where: {
      role: UserRole.VENDEDOR,
      deleted_at: null,
      supervisor_id: fromSupervisor.id,
    },
    data: {
      supervisor_id: toSupervisor.id,
    },
  });

  return {
    from_supervisor_id: fromSupervisor.id,
    to_supervisor_id: toSupervisor.id,
    company_id: fromSupervisor.company_id,
    moved_vendors: moved.count,
  };
}

export async function reassignManagerTeam(actor: AuthActor, input: ReassignManagerTeamInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw forbidden('Somente admin pode reatribuir equipes entre gerentes');
  }

  if (input.from_manager_id === input.to_manager_id) {
    throw badRequest('Gerente de origem e destino não podem ser iguais');
  }

  const [fromManager, toManager] = await Promise.all([
    getManagerForReassign(input.from_manager_id),
    getManagerForReassign(input.to_manager_id),
  ]);

  if (fromManager.company_id !== toManager.company_id) {
    throw badRequest('Gerentes devem pertencer à mesma empresa');
  }

  const result = await prisma.$transaction(async (tx) => {
    const vendorsImpacted = await tx.user.count({
      where: {
        role: UserRole.VENDEDOR,
        deleted_at: null,
        supervisor: {
          is: {
            deleted_at: null,
            role: UserRole.SUPERVISOR,
            manager_id: fromManager.id,
          },
        },
      },
    });

    const supervisorsMoved = await tx.user.updateMany({
      where: {
        role: UserRole.SUPERVISOR,
        deleted_at: null,
        manager_id: fromManager.id,
      },
      data: {
        manager_id: toManager.id,
      },
    });

    return {
      supervisors_moved: supervisorsMoved.count,
      vendors_impacted: vendorsImpacted,
    };
  });

  return {
    from_manager_id: fromManager.id,
    to_manager_id: toManager.id,
    company_id: fromManager.company_id,
    supervisors_moved: result.supervisors_moved,
    vendors_impacted: result.vendors_impacted,
  };
}

function mapPublicUser(user: PublicUserViewInput) {
  return {
    id: user.id,
    company_id: user.company_id,
    company: user.company ?? null,
    manager_id: user.manager_id ?? null,
    manager: user.manager ?? null,
    supervisor_id: user.supervisor_id ?? null,
    supervisor: user.supervisor ?? null,
    role: user.role,
    full_name: user.full_name,
    cpf: user.cpf,
    email: user.email,
    phone: user.phone,
    is_active: user.is_active,
    deleted_at: user.deleted_at ?? null,
    password_status:
      user.role === UserRole.VENDEDOR ? 'NOT_APPLICABLE' : user.passwordHash ? 'SET' : 'PENDING',
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}



