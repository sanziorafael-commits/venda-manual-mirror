import { UserRole } from '@prisma/client';

const INVITABLE_ROLES = new Set<UserRole>([
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
]);

export function isRoleWithDashboardAccess(role: UserRole) {
  return role !== UserRole.VENDEDOR;
}

export function isInvitableRole(role: UserRole) {
  return INVITABLE_ROLES.has(role);
}

export function canCreateRole(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === UserRole.ADMIN) {
    return true;
  }

  if (actorRole === UserRole.DIRETOR) {
    return (
      targetRole === UserRole.GERENTE_COMERCIAL ||
      targetRole === UserRole.SUPERVISOR ||
      targetRole === UserRole.VENDEDOR
    );
  }

  if (actorRole === UserRole.GERENTE_COMERCIAL) {
    return targetRole === UserRole.SUPERVISOR || targetRole === UserRole.VENDEDOR;
  }

  if (actorRole === UserRole.SUPERVISOR) {
    return targetRole === UserRole.VENDEDOR;
  }

  return false;
}

export function canManageRole(actorRole: UserRole, targetRole: UserRole) {
  return canCreateRole(actorRole, targetRole);
}


