import { UserRole, type Prisma } from '@prisma/client';

import type { AuthActor } from '../types/auth.types.js';

import { forbidden } from './app-error.js';
import { hasCompanyWideScope } from './role-capabilities.js';

export type RbacScopeContext = 'users' | 'dashboard' | 'conversations' | 'locatedClients';

function buildSupervisorScopedWhere(
  context: RbacScopeContext,
  actorUserId: string,
): Prisma.UserWhereInput {
  if (context === 'users') {
    return {
      role: UserRole.VENDEDOR,
      supervisor_id: actorUserId,
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
        supervisor_id: actorUserId,
      },
    ],
  };
}

function buildManagerScopedWhere(actorUserId: string): Prisma.UserWhereInput {
  return {
    OR: [
      {
        role: UserRole.SUPERVISOR,
        manager_id: actorUserId,
      },
      {
        role: UserRole.VENDEDOR,
        supervisor: {
          is: {
            manager_id: actorUserId,
          },
        },
      },
    ],
  };
}

function buildCompanyScopedUsersWhere(roles: readonly UserRole[]): Prisma.UserWhereInput {
  return {
    role: {
      in: [...roles],
    },
  };
}

function buildManagerUsersScopedWhere(actorUserId: string): Prisma.UserWhereInput {
  return {
    OR: [
      buildManagerScopedWhere(actorUserId),
      buildCompanyScopedUsersWhere([
        UserRole.RESPONSAVEL_TI,
        UserRole.TECNICO_GASTRONOMICO,
      ]),
    ],
  };
}

export function resolveActorCompanyScope(actor: AuthActor, requestedCompanyId?: string) {
  if (actor.role === UserRole.ADMIN) {
    return requestedCompanyId ?? null;
  }

  if (!actor.company_id) {
    throw forbidden('Usuário não está vinculado a uma empresa');
  }

  return actor.company_id;
}

export function assertActorCompanyScope(actor: AuthActor, targetCompanyId: string | null) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!actor.company_id || actor.company_id !== targetCompanyId) {
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

  if (actor.role === UserRole.DIRETOR) {
    if (context === 'users') {
      return buildCompanyScopedUsersWhere([
        UserRole.GERENTE_COMERCIAL,
        UserRole.SUPERVISOR,
        UserRole.VENDEDOR,
        UserRole.RESPONSAVEL_TI,
        UserRole.TECNICO_GASTRONOMICO,
      ]);
    }

    return {};
  }

  if (actor.role === UserRole.RESPONSAVEL_TI) {
    if (context === 'users') {
      return buildCompanyScopedUsersWhere([
        UserRole.DIRETOR,
        UserRole.GERENTE_COMERCIAL,
        UserRole.SUPERVISOR,
        UserRole.VENDEDOR,
        UserRole.RESPONSAVEL_TI,
        UserRole.TECNICO_GASTRONOMICO,
      ]);
    }

    return {};
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL) {
    return context === 'users' ? buildManagerUsersScopedWhere(actor.user_id) : buildManagerScopedWhere(actor.user_id);
  }

  if (actor.role === UserRole.SUPERVISOR) {
    return buildSupervisorScopedWhere(context, actor.user_id);
  }

  if (hasCompanyWideScope(actor.role)) {
    return {};
  }

  return {
    id: '__forbidden__',
  };
}


