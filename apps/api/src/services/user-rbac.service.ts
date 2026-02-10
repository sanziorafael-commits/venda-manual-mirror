import { UserRole } from '@prisma/client';

import type { AuthActor } from '../types/auth.types.js';
import { badRequest, forbidden } from '../utils/app-error.js';
import { canCreateRole, canManageRole, isInvitableRole } from '../utils/user-role-policy.js';

export type ScopedTargetUser = {
  id: string;
  role: UserRole;
  companyId: string | null;
  managerId: string | null;
  supervisorId: string | null;
  supervisor: { id: string; managerId: string | null } | null;
};

export function canReadUserByHierarchy(actor: AuthActor, target: ScopedTargetUser) {
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

export function assertManageScope(actor: AuthActor, target: ScopedTargetUser) {
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

export function validateCreatePermissions(actor: AuthActor, role: UserRole) {
  if (!canCreateRole(actor.role, role)) {
    throw forbidden('Você não tem permissão para criar este cargo');
  }
}

export function validateUpdatePermissions(
  actor: AuthActor,
  existingRole: UserRole,
  nextRole?: UserRole,
) {
  if (!canManageRole(actor.role, existingRole)) {
    throw forbidden('Você não tem permissão para editar este cargo');
  }

  if (nextRole && !canCreateRole(actor.role, nextRole)) {
    throw forbidden('Você não tem permissão para definir este cargo');
  }
}

export function validateCredentialsForRole(role: UserRole, email?: string | null, password?: string) {
  if (role === UserRole.VENDEDOR) {
    if (password) {
      throw badRequest('Vendedor não deve possuir senha');
    }

    return;
  }

  if (!email) {
    throw badRequest('E-mail obrigatório para cargos com acesso ao dashboard');
  }

  if (isInvitableRole(role) && password) {
    throw badRequest('Gerente comercial e supervisor devem ativar senha via convite');
  }

  if (role === UserRole.ADMIN && !password) {
    throw badRequest('Senha obrigatória para admin');
  }
}

export function validateCompanyForRole(role: UserRole, companyId: string | null) {
  if (role === UserRole.ADMIN && companyId) {
    throw badRequest('Admin não deve estar vinculado à empresa');
  }

  if (role !== UserRole.ADMIN && !companyId) {
    throw badRequest('companyId obrigatório para cargos não-admin');
  }
}
