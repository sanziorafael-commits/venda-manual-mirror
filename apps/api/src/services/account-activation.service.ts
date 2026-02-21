import { randomBytes } from 'node:crypto';

import { UserRole } from '@prisma/client';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { sha256 } from '../utils/hash.js';
import { ttlToDate } from '../utils/time.js';
import { canManageRole, isInvitableRole } from '../utils/user-role-policy.js';
import { createUuidV7 } from '../utils/uuid.js';

import { sendActivationInviteEmail } from './email.service.js';

export type ActivationInviteResult = {
  user_id: string;
  email: string;
  expires_at: Date;
  activation_token?: string;
};

export async function createActivationInviteForUser(user_id: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: user_id,
      deleted_at: null,
    },
    select: {
      id: true,
      role: true,
      full_name: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  assertUserCanReceiveActivationInvite(user.role, user.email, user.passwordHash);

  const now = new Date();
  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = ttlToDate(env.ACCOUNT_ACTIVATION_TOKEN_TTL);

  await prisma.$transaction([
    prisma.accountActivationToken.updateMany({
      where: {
        user_id: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    }),
    prisma.accountActivationToken.create({
      data: {
        id: createUuidV7(),
        user_id: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendActivationInviteEmail({
    to: user.email!,
    full_name: user.full_name,
    token,
  });

  return {
    user_id: user.id,
    email: user.email!,
    expires_at: expiresAt,
    activation_token: env.NODE_ENV === 'production' ? undefined : token,
  } satisfies ActivationInviteResult;
}

export async function resendActivationInvite(actor: AuthActor, user_id: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: user_id,
      deleted_at: null,
    },
    select: {
      id: true,
      company_id: true,
      role: true,
      manager_id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  assertResendScope(actor, user);
  assertUserCanReceiveActivationInvite(user.role, user.email, user.passwordHash);

  return createActivationInviteForUser(user.id);
}

export async function activateAccountWithToken(token: string, passwordHash: string) {
  const tokenHash = sha256(token);
  const now = new Date();

  const updatedUser = await prisma.$transaction(async (tx) => {
    const activationToken = await tx.accountActivationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: true,
      },
    });

    if (!activationToken) {
      throw badRequest('Token de ativação inválido ou expirado');
    }

    const user = activationToken.user;
    if (user.deleted_at || !user.is_active) {
      throw forbidden('Conta inativa');
    }

    if (!isInvitableRole(user.role)) {
      throw forbidden('Este cargo não pode ativar conta por token de convite');
    }

    if (user.passwordHash) {
      throw badRequest('A conta já está ativa');
    }

    if (user.role !== UserRole.ADMIN && user.company_id) {
      const company = await tx.company.findFirst({
        where: {
          id: user.company_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });

      if (!company) {
        throw forbidden('Conta inativa');
      }
    }

    const consumedToken = await tx.accountActivationToken.updateMany({
      where: {
        id: activationToken.id,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        usedAt: now,
      },
    });

    if (consumedToken.count === 0) {
      throw badRequest('Token de ativação inválido ou expirado');
    }

    const updated = await tx.user.updateMany({
      where: {
        id: user.id,
        deleted_at: null,
        is_active: true,
        passwordHash: null,
      },
      data: {
        passwordHash,
      },
    });

    if (updated.count === 0) {
      throw badRequest('A conta já está ativa');
    }

    await tx.accountActivationToken.updateMany({
      where: {
        user_id: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    return tx.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
    });
  });

  return updatedUser;
}

function assertResendScope(
  actor: AuthActor,
  target: {
    company_id: string | null;
    role: UserRole;
    manager_id: string | null;
  },
) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!actor.company_id || actor.company_id !== target.company_id) {
    throw forbidden('Você não tem acesso ao escopo desta empresa');
  }

  if (!canManageRole(actor.role, target.role)) {
    throw forbidden('Você não tem permissão para reenviar convite deste cargo');
  }

  if (actor.role === UserRole.GERENTE_COMERCIAL && target.role === UserRole.SUPERVISOR) {
    if (target.manager_id !== actor.user_id) {
      throw forbidden('Você não tem permissão para reenviar convite deste supervisor');
    }
  }
}

function assertUserCanReceiveActivationInvite(
  role: UserRole,
  email: string | null,
  passwordHash: string | null,
) {
  if (!isInvitableRole(role)) {
    throw badRequest('O cargo informado não suporta ativação por convite');
  }

  if (!email) {
    throw badRequest('Email obrigatório para envio de convite');
  }

  if (passwordHash) {
    throw badRequest('O usuário já possui senha');
  }
}


