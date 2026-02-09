import { UserRole, type Prisma } from '@prisma/client';

import type { AuthActor } from '../types/auth.types.js';

import { forbidden } from './app-error.js';

export type RbacScopeContext = 'users' | 'dashboard' | 'conversations' | 'locatedClients';

function buildSupervisorScopedWhere(
  context: RbacScopeContext,
  actorUserId: string,
): Prisma.UserWhereInput {
  if (context === 'users') {
    return {
      role: UserRole.VENDEDOR,
      supervisorId: actorUserId,
    };
  }

  return {
    OR: [
      {
        role: UserRole.SUPERVISOR,
        id: actorUserId,
      },
      {
        role: UserRole.VENDEDOR,
        supervisorId: actorUserId,
      },
    ],
  };
}

function buildManagerScopedWhere(actorUserId: string): Prisma.UserWhereInput {
  return {
    OR: [
      {
        role: UserRole.SUPERVISOR,
        managerId: actorUserId,
      },
      {
        role: UserRole.VENDEDOR,
        supervisor: {
          is: {
            managerId: actorUserId,
          },
        },
      },
    ],
  };
}

export function resolveActorCompanyScope(actor: AuthActor, requestedCompanyId?: string) {
  if (actor.role === UserRole.ADMIN) {
    return requestedCompanyId ?? null;
  }

  if (!actor.companyId) {
    throw forbidden('Usuário não está vinculado a uma empresa');
  }

  return actor.companyId;
}

export function assertActorCompanyScope(actor: AuthActor, targetCompanyId: string | null) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!actor.companyId || actor.companyId !== targetCompanyId) {
    throw forbidden('Você não tem acesso ao escopo desta empresa');
  }
}

export function getUserReadScopeWhere(
  actor: AuthActor,
  context: RbacScopeContext,
): Prisma.UserWhereInput {
  if (actor.role === UserRole.ADMIN) {
    return {};
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    return buildManagerScopedWhere(actor.userId);
  }

  if (actor.role === UserRole.SUPERVISOR) {
    return buildSupervisorScopedWhere(context, actor.userId);
  }

  return {
    id: '__forbidden__',
  };
}
