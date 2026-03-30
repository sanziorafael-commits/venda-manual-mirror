import { UserRole } from '@prisma/client';

import type { AuthActor } from '../types/auth.types.js';
import { badRequest, forbidden } from '../utils/app-error.js';
import { canCreateRole, canManageRole, isInvitableRole } from '../utils/user-role-policy.js';

export type ScopedTargetUser = {
  id: string;
  role: UserRole;
  company_id: string | null;
  manager_id: string | null;
  supervisor_id: string | null;
  supervisor: { id: string; manager_id: string | null } | null;
};

export function canReadUserByHierarchy(actor: AuthActor, target: ScopedTargetUser) {
  if (actor.role === UserRole.ADMIN) {
    return true;
  }

  if (!actor.company_id || actor.company_id !== target.company_id) {
    return false;
  }

  if (actor.role === UserRole.DIRETOR) {
    return (
      target.role === UserRole.GERENTE_COMERCIAL ||
      target.role === UserRole.SUPERVISOR ||
      target.role === UserRole.VENDEDOR ||
      target.role === UserRole.RESPONSAVEL_TI ||
      target.role === UserRole.TECNICO_GASTRONOMICO
    );
  }

  if (actor.role === UserRole.RESPONSAVEL_TI) {
    return (
      target.role === UserRole.DIRETOR ||
      target.role === UserRole.GERENTE_COMERCIAL ||
      target.role === UserRole.SUPERVISOR ||
      target.role === UserRole.VENDEDOR ||
      target.role === UserRole.RESPONSAVEL_TI ||
      target.role === UserRole.TECNICO_GASTRONOMICO
    );
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    if (
      target.role === UserRole.RESPONSAVEL_TI ||
      target.role === UserRole.TECNICO_GASTRONOMICO
    ) {
      return true;
    }

    if (target.role === UserRole.SUPERVISOR) {
      return target.manager_id === actor.user_id;
    }

    if (target.role === UserRole.VENDEDOR) {
      return target.supervisor?.manager_id === actor.user_id;
    }

    return false;
  }

  if (actor.role === UserRole.SUPERVISOR) {
    return target.role === UserRole.VENDEDOR && target.supervisor_id === actor.user_id;
  }

  return false;
}

export function assertManageScope(actor: AuthActor, target: ScopedTargetUser) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!canManageRole(actor.role, target.role)) {
    throw forbidden('Voce nao tem permissao para editar este cargo');
  }

  if (!canReadUserByHierarchy(actor, target)) {
    throw forbidden('Voce nao tem permissao para operar este usuario');
  }
}

export function validateCreatePermissions(actor: AuthActor, role: UserRole) {
  if (!canCreateRole(actor.role, role)) {
    throw forbidden('Voce nao tem permissao para criar este cargo');
  }
}

export function validateUpdatePermissions(
  actor: AuthActor,
  existingRole: UserRole,
  nextRole?: UserRole,
) {
  if (!canManageRole(actor.role, existingRole)) {
    throw forbidden('Voce nao tem permissao para editar este cargo');
  }

  if (nextRole && nextRole !== existingRole && !canCreateRole(actor.role, nextRole)) {
    throw forbidden('Voce nao tem permissao para definir este cargo');
  }
}

export function validateCredentialsForRole(role: UserRole, email?: string | null, password?: string) {
  if (role === UserRole.VENDEDOR) {
    if (password) {
      throw badRequest('Vendedor nao deve possuir senha');
    }

    return;
  }

  if (!email) {
    throw badRequest('E-mail obrigatorio para cargos com acesso ao dashboard');
  }

  if (isInvitableRole(role) && password) {
    throw badRequest('Este cargo deve ativar senha via convite');
  }

  if (role === UserRole.ADMIN && !password) {
    throw badRequest('Senha obrigatoria para admin');
  }
}

export function validateCompanyForRole(role: UserRole, company_id: string | null) {
  if (role === UserRole.ADMIN && company_id) {
    throw badRequest('Admin nao deve estar vinculado a empresa');
  }

  if (role !== UserRole.ADMIN && !company_id) {
    throw badRequest('company_id obrigatorio para cargos nao-admin');
  }
}
