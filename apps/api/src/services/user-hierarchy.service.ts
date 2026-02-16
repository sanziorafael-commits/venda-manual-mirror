import { UserRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';

export type ResolvedHierarchy = {
  managerId: string | null;
  supervisorId: string | null;
};

type ExistingHierarchyInput = {
  role: UserRole;
  managerId: string | null;
  supervisorId: string | null;
  companyId: string | null;
  supervisor: { id: string; managerId: string | null } | null;
};

export async function resolveHierarchyForCreate(
  actor: AuthActor,
  input: {
    role: UserRole;
    companyId: string | null;
    managerId?: string | null;
    supervisorId?: string | null;
  },
): Promise<ResolvedHierarchy> {
  if (
    input.role === UserRole.ADMIN ||
    input.role === UserRole.DIRETOR ||
    input.role === UserRole.GERENTE_COMERCIAL
  ) {
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

export async function resolveHierarchyForUpdate(
  actor: AuthActor,
  input: {
    existing: ExistingHierarchyInput;
    nextRole: UserRole;
    companyId: string | null;
    managerId?: string | null;
    supervisorId?: string | null;
  },
): Promise<ResolvedHierarchy> {
  const { existing, nextRole, companyId } = input;

  if (
    nextRole === UserRole.ADMIN ||
    nextRole === UserRole.DIRETOR ||
    nextRole === UserRole.GERENTE_COMERCIAL
  ) {
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

export async function assertCompanyExistsIfRequired(companyId: string | null) {
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

export async function getSupervisorForReassign(supervisorId: string) {
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

export async function getManagerForReassign(managerId: string) {
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
