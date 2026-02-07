import { UserRole } from '@prisma/client';

import type { AuthActor } from '../types/auth.types.js';

import { forbidden } from './app-error.js';

export type RbacScopeContext = 'users' | 'dashboard' | 'conversations' | 'locatedClients';

type RoleReadScope = UserRole[] | null;
type ScopedUserTarget = {
  id: string;
  role: UserRole;
  companyId: string | null;
};

const RBAC_READ_SCOPE_BY_CONTEXT: Record<RbacScopeContext, Record<UserRole, RoleReadScope>> = {
  users: {
    [UserRole.ADMIN]: null,
    [UserRole.GERENTE_COMERCIAL]: [UserRole.SUPERVISOR, UserRole.VENDEDOR],
    [UserRole.SUPERVISOR]: [UserRole.VENDEDOR],
    [UserRole.VENDEDOR]: [],
  },
  dashboard: {
    [UserRole.ADMIN]: null,
    [UserRole.GERENTE_COMERCIAL]: [UserRole.SUPERVISOR, UserRole.VENDEDOR],
    [UserRole.SUPERVISOR]: [UserRole.SUPERVISOR, UserRole.VENDEDOR],
    [UserRole.VENDEDOR]: [],
  },
  conversations: {
    [UserRole.ADMIN]: null,
    [UserRole.GERENTE_COMERCIAL]: [UserRole.SUPERVISOR, UserRole.VENDEDOR],
    [UserRole.SUPERVISOR]: [UserRole.SUPERVISOR, UserRole.VENDEDOR],
    [UserRole.VENDEDOR]: [],
  },
  locatedClients: {
    [UserRole.ADMIN]: null,
    [UserRole.GERENTE_COMERCIAL]: [UserRole.SUPERVISOR, UserRole.VENDEDOR],
    [UserRole.SUPERVISOR]: [UserRole.SUPERVISOR, UserRole.VENDEDOR],
    [UserRole.VENDEDOR]: [],
  },
};

export function resolveActorCompanyScope(actor: AuthActor, requestedCompanyId?: string) {
  if (actor.role === UserRole.ADMIN) {
    return requestedCompanyId ?? null;
  }

  if (!actor.companyId) {
    throw forbidden('Usuario nao esta vinculado a uma empresa');
  }

  return actor.companyId;
}

export function assertActorCompanyScope(actor: AuthActor, targetCompanyId: string | null) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!actor.companyId || actor.companyId !== targetCompanyId) {
    throw forbidden('Voce nao tem acesso ao escopo desta empresa');
  }
}

export function getReadableRolesForContext(actorRole: UserRole, context: RbacScopeContext) {
  return RBAC_READ_SCOPE_BY_CONTEXT[context][actorRole];
}

export function getUserRoleScopeWhere(actor: AuthActor, context: RbacScopeContext) {
  const readableRoles = getReadableRolesForContext(actor.role, context);
  if (readableRoles === null) {
    return {};
  }

  if (
    actor.role === UserRole.SUPERVISOR &&
    (context === 'dashboard' || context === 'conversations' || context === 'locatedClients')
  ) {
    return {
      OR: [{ role: UserRole.VENDEDOR }, { role: UserRole.SUPERVISOR, id: actor.userId }],
    };
  }

  return { role: { in: readableRoles } };
}

export function canReadRoleForContext(
  actorRole: UserRole,
  targetRole: UserRole,
  context: RbacScopeContext,
) {
  const readableRoles = getReadableRolesForContext(actorRole, context);
  if (readableRoles === null) {
    return true;
  }

  return readableRoles.includes(targetRole);
}

export function canReadUserForContext(
  actor: AuthActor,
  targetUser: ScopedUserTarget,
  context: RbacScopeContext,
) {
  assertActorCompanyScope(actor, targetUser.companyId);

  if (!canReadRoleForContext(actor.role, targetUser.role, context)) {
    return false;
  }

  if (
    actor.role === UserRole.SUPERVISOR &&
    targetUser.role === UserRole.SUPERVISOR &&
    (context === 'dashboard' || context === 'conversations' || context === 'locatedClients')
  ) {
    return targetUser.id === actor.userId;
  }

  return true;
}
