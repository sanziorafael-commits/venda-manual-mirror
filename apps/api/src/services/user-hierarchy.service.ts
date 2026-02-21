import { UserRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';

export type ResolvedHierarchy = {
  manager_id: string | null;
  supervisor_id: string | null;
};

type ExistingHierarchyInput = {
  role: UserRole;
  manager_id: string | null;
  supervisor_id: string | null;
  company_id: string | null;
  supervisor: { id: string; manager_id: string | null } | null;
};

export async function resolveHierarchyForCreate(
  actor: AuthActor,
  input: {
    role: UserRole;
    company_id: string | null;
    manager_id?: string | null;
    supervisor_id?: string | null;
  },
): Promise<ResolvedHierarchy> {
  if (
    input.role === UserRole.ADMIN ||
    input.role === UserRole.DIRETOR ||
    input.role === UserRole.GERENTE_COMERCIAL
  ) {
    if (input.manager_id || input.supervisor_id) {
      throw badRequest('manager_id e supervisor_id não são permitidos para este cargo');
    }

    return {
      manager_id: null,
      supervisor_id: null,
    };
  }

  if (input.role === UserRole.SUPERVISOR) {
    if (input.supervisor_id) {
      throw badRequest('supervisor_id não é permitido para cargo SUPERVISOR');
    }

    if (actor.role === UserRole.GERENTE_COMERCIAL) {
      if (input.manager_id && input.manager_id !== actor.user_id) {
        throw forbidden('Gerente só pode vincular supervisor a si mesmo');
      }

      return {
        manager_id: actor.user_id,
        supervisor_id: null,
      };
    }

    const manager_id = input.manager_id;
    if (!manager_id || !input.company_id) {
      throw badRequest('manager_id obrigatório para criar SUPERVISOR');
    }

    await assertManagerLink(manager_id, input.company_id);
    return {
      manager_id,
      supervisor_id: null,
    };
  }

  if (input.manager_id) {
    throw badRequest('manager_id não é permitido para cargo VENDEDOR');
  }

  if (actor.role === UserRole.SUPERVISOR) {
    if (input.supervisor_id && input.supervisor_id !== actor.user_id) {
      throw forbidden('Supervisor só pode vincular vendedor a si mesmo');
    }

    return {
      manager_id: null,
      supervisor_id: actor.user_id,
    };
  }

  const supervisor_id = input.supervisor_id;
  if (!supervisor_id || !input.company_id) {
    throw badRequest('supervisor_id obrigatório para criar VENDEDOR');
  }

  const supervisor = await assertSupervisorLink(supervisor_id, input.company_id);
  if (actor.role === UserRole.GERENTE_COMERCIAL && supervisor.manager_id !== actor.user_id) {
    throw forbidden('Você só pode vincular vendedores a supervisores do seu escopo');
  }

  return {
    manager_id: null,
    supervisor_id,
  };
}

export async function resolveHierarchyForUpdate(
  actor: AuthActor,
  input: {
    existing: ExistingHierarchyInput;
    nextRole: UserRole;
    company_id: string | null;
    manager_id?: string | null;
    supervisor_id?: string | null;
  },
): Promise<ResolvedHierarchy> {
  const { existing, nextRole, company_id } = input;

  if (
    nextRole === UserRole.ADMIN ||
    nextRole === UserRole.DIRETOR ||
    nextRole === UserRole.GERENTE_COMERCIAL
  ) {
    if (input.manager_id || input.supervisor_id) {
      throw badRequest('manager_id e supervisor_id não são permitidos para este cargo');
    }

    return {
      manager_id: null,
      supervisor_id: null,
    };
  }

  if (nextRole === UserRole.SUPERVISOR) {
    if (input.supervisor_id) {
      throw badRequest('supervisor_id não é permitido para cargo SUPERVISOR');
    }

    if (!company_id) {
      throw badRequest('company_id obrigatório para SUPERVISOR');
    }

    if (actor.role === UserRole.GERENTE_COMERCIAL) {
      if (input.manager_id !== undefined && input.manager_id !== actor.user_id) {
        throw forbidden('Gerente só pode vincular supervisor a si mesmo');
      }

      return {
        manager_id: actor.user_id,
        supervisor_id: null,
      };
    }

    const manager_id = input.manager_id === undefined ? existing.manager_id : input.manager_id;
    if (!manager_id) {
      throw badRequest('manager_id obrigatório para cargo SUPERVISOR');
    }

    await assertManagerLink(manager_id, company_id);
    return {
      manager_id,
      supervisor_id: null,
    };
  }

  if (!company_id) {
    throw badRequest('company_id obrigatório para VENDEDOR');
  }

  if (input.manager_id) {
    throw badRequest('manager_id não é permitido para cargo VENDEDOR');
  }

  if (actor.role === UserRole.SUPERVISOR) {
    if (input.supervisor_id !== undefined && input.supervisor_id !== actor.user_id) {
      throw forbidden('Supervisor não pode mover vendedor para outro supervisor');
    }

    return {
      manager_id: null,
      supervisor_id: actor.user_id,
    };
  }

  const supervisor_id =
    input.supervisor_id === undefined ? existing.supervisor_id : input.supervisor_id;
  if (!supervisor_id) {
    throw badRequest('supervisor_id obrigatório para cargo VENDEDOR');
  }

  const supervisor = await assertSupervisorLink(supervisor_id, company_id);
  if (actor.role === UserRole.GERENTE_COMERCIAL && supervisor.manager_id !== actor.user_id) {
    throw forbidden('Você só pode vincular vendedor a supervisores do seu escopo');
  }

  return {
    manager_id: null,
    supervisor_id,
  };
}

export async function assertCompanyExistsIfRequired(company_id: string | null) {
  if (!company_id) {
    return;
  }

  const company = await prisma.company.findFirst({
    where: {
      id: company_id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!company) {
    throw notFound('Empresa não encontrada');
  }
}

export async function getSupervisorForReassign(supervisor_id: string) {
  const supervisor = await prisma.user.findFirst({
    where: {
      id: supervisor_id,
      role: UserRole.SUPERVISOR,
      deleted_at: null,
    },
    select: {
      id: true,
      company_id: true,
      manager_id: true,
    },
  });

  if (!supervisor || !supervisor.company_id) {
    throw badRequest('Supervisor de origem ou destino inválido');
  }

  return supervisor;
}

export async function getManagerForReassign(manager_id: string) {
  const manager = await prisma.user.findFirst({
    where: {
      id: manager_id,
      role: UserRole.GERENTE_COMERCIAL,
      deleted_at: null,
    },
    select: {
      id: true,
      company_id: true,
    },
  });

  if (!manager || !manager.company_id) {
    throw badRequest('Gerente comercial de origem ou destino inválido');
  }

  return manager;
}

async function assertManagerLink(manager_id: string, company_id: string) {
  const manager = await prisma.user.findFirst({
    where: {
      id: manager_id,
      role: UserRole.GERENTE_COMERCIAL,
      company_id,
      is_active: true,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!manager) {
    throw badRequest('Gerente comercial inválido para esta empresa');
  }
}

async function assertSupervisorLink(supervisor_id: string, company_id: string) {
  const supervisor = await prisma.user.findFirst({
    where: {
      id: supervisor_id,
      role: UserRole.SUPERVISOR,
      company_id,
      is_active: true,
      deleted_at: null,
    },
    select: {
      id: true,
      manager_id: true,
    },
  });

  if (!supervisor) {
    throw badRequest('Supervisor inválido para esta empresa');
  }

  return supervisor;
}


