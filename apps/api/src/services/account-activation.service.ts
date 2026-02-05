import { randomBytes } from 'node:crypto';

import { UserRole } from '@prisma/client';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import type { AuthActor } from '../types/auth.types.js';
import { badRequest, forbidden, notFound } from '../utils/app-error.js';
import { sha256 } from '../utils/hash.js';
import { ttlToDate } from '../utils/time.js';
import { canManageRole, isInvitableRole } from '../utils/user-role-policy.js';

import { sendActivationInviteEmail } from './email.service.js';

export type ActivationInviteResult = {
  userId: string;
  email: string;
  expiresAt: Date;
  activationToken?: string;
};

export async function createActivationInviteForUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      role: true,
      fullName: true,
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
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    }),
    prisma.accountActivationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendActivationInviteEmail({
    to: user.email!,
    fullName: user.fullName,
    token,
  });

  return {
    userId: user.id,
    email: user.email!,
    expiresAt,
    activationToken: env.NODE_ENV === 'production' ? undefined : token,
  } satisfies ActivationInviteResult;
}

export async function resendActivationInvite(actor: AuthActor, userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      companyId: true,
      role: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  assertResendScope(actor, user.companyId, user.role);
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
    if (user.deletedAt || !user.isActive) {
      throw forbidden('Conta inativa');
    }

    if (!isInvitableRole(user.role)) {
      throw forbidden('Este cargo não pode ativar conta por token de convite');
    }

    if (user.passwordHash) {
      throw badRequest('A conta já está ativa');
    }

    if (user.role !== UserRole.ADMIN && user.companyId) {
      const company = await tx.company.findFirst({
        where: {
          id: user.companyId,
          deletedAt: null,
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
        deletedAt: null,
        isActive: true,
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
        userId: user.id,
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

function assertResendScope(actor: AuthActor, targetCompanyId: string | null, targetRole: UserRole) {
  if (actor.role === UserRole.ADMIN) {
    return;
  }

  if (!actor.companyId || actor.companyId !== targetCompanyId) {
    throw forbidden('Você não tem acesso ao escopo desta empresa');
  }

  if (!canManageRole(actor.role, targetRole)) {
    throw forbidden('Você não tem permissão para reenviar convite deste cargo');
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
