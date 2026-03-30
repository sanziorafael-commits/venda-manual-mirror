import { UserRole } from '@prisma/client';

import { isRoleWithDashboardAccess as hasDashboardAccess } from './role-capabilities.js';

const INVITABLE_ROLES = new Set<UserRole>([
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
  UserRole.TECNICO_GASTRONOMICO,
]);

const CREATE_ROLE_MATRIX: Record<UserRole, readonly UserRole[]> = {
  [UserRole.ADMIN]: [
    UserRole.ADMIN,
    UserRole.DIRETOR,
    UserRole.GERENTE_COMERCIAL,
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.DIRETOR]: [
    UserRole.GERENTE_COMERCIAL,
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.GERENTE_COMERCIAL]: [
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.SUPERVISOR]: [UserRole.VENDEDOR],
  [UserRole.VENDEDOR]: [],
  [UserRole.RESPONSAVEL_TI]: [
    UserRole.GERENTE_COMERCIAL,
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.TECNICO_GASTRONOMICO]: [],
};

const MANAGE_ROLE_MATRIX: Record<UserRole, readonly UserRole[]> = {
  [UserRole.ADMIN]: [
    UserRole.ADMIN,
    UserRole.DIRETOR,
    UserRole.GERENTE_COMERCIAL,
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.DIRETOR]: [
    UserRole.GERENTE_COMERCIAL,
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.GERENTE_COMERCIAL]: [
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.SUPERVISOR]: [UserRole.VENDEDOR],
  [UserRole.VENDEDOR]: [],
  [UserRole.RESPONSAVEL_TI]: [
    UserRole.DIRETOR,
    UserRole.GERENTE_COMERCIAL,
    UserRole.SUPERVISOR,
    UserRole.VENDEDOR,
    UserRole.RESPONSAVEL_TI,
    UserRole.TECNICO_GASTRONOMICO,
  ],
  [UserRole.TECNICO_GASTRONOMICO]: [],
};

function hasMappedRoleAccess(
  actorRole: UserRole,
  targetRole: UserRole,
  matrix: Record<UserRole, readonly UserRole[]>,
) {
  return matrix[actorRole]?.includes(targetRole) ?? false;
}

export function isRoleWithDashboardAccess(role: UserRole) {
  return hasDashboardAccess(role);
}

export function isInvitableRole(role: UserRole) {
  return INVITABLE_ROLES.has(role);
}

export function canCreateRole(actorRole: UserRole, targetRole: UserRole) {
  return hasMappedRoleAccess(actorRole, targetRole, CREATE_ROLE_MATRIX);
}

export function canManageRole(actorRole: UserRole, targetRole: UserRole) {
  return hasMappedRoleAccess(actorRole, targetRole, MANAGE_ROLE_MATRIX);
}
