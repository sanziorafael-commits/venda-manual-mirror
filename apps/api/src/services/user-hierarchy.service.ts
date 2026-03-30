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

function isRoleWithoutHierarchy(role: UserRole) {
  return (
    role === UserRole.ADMIN ||
    role === UserRole.DIRETOR ||
    role === UserRole.GERENTE_COMERCIAL ||
    role === UserRole.RESPONSAVEL_TI ||
    role === UserRole.TECNICO_GASTRONOMICO
  );
}

export async function resolveHierarchyForCreate(
  actor: AuthActor,
  input: {
    role: UserRole;
    company_id: string | null;
    manager_id?: string | null;
    supervisor_id?: string | null;
  },
): Promise<ResolvedHierarchy> {
  if (isRoleWithoutHierarchy(input.role)) {
    if (input.manager_id || input.supervisor_id) {
      throw badRequest('manager_id e supervisor_id nao sao permitidos para este cargo');
    }

    return {
      manager_id: null,
      supervisor_id: null,
    };
  }

  if (input.role === UserRole.SUPERVISOR) {
    if (input.supervisor_id) {
      throw badRequest('supervisor_id nao e permitido para cargo SUPERVISOR');
    }

    if (actor.role === UserRole.GERENTE_COMERCIAL) {
      if (input.manager_id && input.manager_id !== actor.user_id) {
        throw forbidden('Gerente so pode vincular supervisor a si mesmo');
      }

      return {
        manager_id: actor.user_id,
        supervisor_id: null,
      };
    }

    const manager_id = input.manager_id;
    if (!manager_id || !input.company_id) {
      throw badRequest('manager_id obrigatorio para criar SUPERVISOR');
    }

    await assertManagerLink(manager_id, input.company_id);
    return {
      manager_id,
      supervisor_id: null,
    };
  }

  if (input.manager_id) {
    throw badRequest('manager_id nao e permitido para cargo VENDEDOR');
  }

  if (actor.role === UserRole.SUPERVISOR) {
    if (input.supervisor_id && input.supervisor_id !== actor.user_id) {
      throw forbidden('Supervisor so pode vincular vendedor a si mesmo');
    }

    return {
      manager_id: null,
      supervisor_id: actor.user_id,
    };
  }

  const supervisor_id = input.supervisor_id;
  if (!supervisor_id || !input.company_id) {
    throw badRequest('supervisor_id obrigatorio para criar VENDEDOR');
  }

  const supervisor = await assertSupervisorLink(supervisor_id, input.company_id);
  if (actor.role === UserRole.GERENTE_COMERCIAL && supervisor.manager_id !== actor.user_id) {
    throw forbidden('Voce so pode vincular vendedores a supervisores do seu escopo');
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

  if (isRoleWithoutHierarchy(nextRole)) {
    if (input.manager_id || input.supervisor_id) {
      throw badRequest('manager_id e supervisor_id nao sao permitidos para este cargo');
    }

    return {
      manager_id: null,
      supervisor_id: null,
    };
  }

  if (nextRole === UserRole.SUPERVISOR) {
    if (input.supervisor_id) {
      throw badRequest('supervisor_id nao e permitido para cargo SUPERVISOR');
    }

    if (!company_id) {
      throw badRequest('company_id obrigatorio para SUPERVISOR');
    }

    if (actor.role === UserRole.GERENTE_COMERCIAL) {
      if (input.manager_id !== undefined && input.manager_id !== actor.user_id) {
        throw forbidden('Gerente so pode vincular supervisor a si mesmo');
      }

      return {
        manager_id: actor.user_id,
        supervisor_id: null,
      };
    }

    const manager_id = input.manager_id === undefined ? existing.manager_id : input.manager_id;
    if (!manager_id) {
      throw badRequest('manager_id obrigatorio para cargo SUPERVISOR');
    }

    await assertManagerLink(manager_id, company_id);
    return {
      manager_id,
      supervisor_id: null,
    };
  }

  if (!company_id) {
    throw badRequest('company_id obrigatorio para VENDEDOR');
  }

  if (input.manager_id) {
    throw badRequest('manager_id nao e permitido para cargo VENDEDOR');
  }

  if (actor.role === UserRole.SUPERVISOR) {
    if (input.supervisor_id !== undefined && input.supervisor_id !== actor.user_id) {
      throw forbidden('Supervisor nao pode mover vendedor para outro supervisor');
    }

    return {
      manager_id: null,
      supervisor_id: actor.user_id,
    };
  }

  const supervisor_id =
    input.supervisor_id === undefined ? existing.supervisor_id : input.supervisor_id;
  if (!supervisor_id) {
    throw badRequest('supervisor_id obrigatorio para cargo VENDEDOR');
  }

  const supervisor = await assertSupervisorLink(supervisor_id, company_id);
  if (actor.role === UserRole.GERENTE_COMERCIAL && supervisor.manager_id !== actor.user_id) {
    throw forbidden('Voce so pode vincular vendedores a supervisores do seu escopo');
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
    throw notFound('Empresa nao encontrada');
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
    throw badRequest('Supervisor de origem ou destino invalido');
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
    throw badRequest('Gerente comercial de origem ou destino invalido');
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
    throw badRequest('Gerente comercial invalido para esta empresa');
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
    throw badRequest('Supervisor invalido para esta empresa');
  }

  return supervisor;
}
