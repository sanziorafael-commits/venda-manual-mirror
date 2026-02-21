import { randomBytes } from 'node:crypto';

import { UserRole } from '@prisma/client';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { badRequest, forbidden } from '../utils/app-error.js';
import { sha256 } from '../utils/hash.js';
import { normalizeEmail } from '../utils/normalizers.js';
import { ttlToDate } from '../utils/time.js';
import { createUuidV7 } from '../utils/uuid.js';

import { sendResetPasswordEmail } from './email.service.js';

export async function requestPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);

  const user = await prisma.user.findFirst({
    where: {
      email,
      deleted_at: null,
      is_active: true,
      role: {
        not: UserRole.VENDEDOR,
      },
      OR: [
        { role: UserRole.ADMIN },
        {
          company: {
            is: {
              deleted_at: null,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user || !user.email || !user.passwordHash) {
    return;
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const now = new Date();
  const expiresAt = ttlToDate(env.PASSWORD_RESET_TOKEN_TTL);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        user_id: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    }),
    prisma.passwordResetToken.create({
      data: {
        id: createUuidV7(),
        user_id: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  await sendResetPasswordEmail({
    to: user.email,
    full_name: user.full_name,
    token,
  });
}

export async function resetPasswordWithToken(token: string, passwordHash: string) {
  const tokenHash = sha256(token);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findFirst({
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

    if (!resetToken) {
      throw badRequest('Token de redefinição inválido ou expirado');
    }

    const user = resetToken.user;
    if (user.deleted_at || !user.is_active) {
      throw forbidden('Conta inativa');
    }

    if (user.role === UserRole.VENDEDOR) {
      throw forbidden('Este cargo não possui acesso ao dashboard');
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

    const consumedToken = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
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
      throw badRequest('Token de redefinição inválido ou expirado');
    }

    const updated = await tx.user.updateMany({
      where: {
        id: user.id,
        deleted_at: null,
        is_active: true,
      },
      data: {
        passwordHash,
      },
    });

    if (updated.count === 0) {
      throw forbidden('Conta inativa');
    }

    await tx.passwordResetToken.updateMany({
      where: {
        user_id: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await tx.session.updateMany({
      where: {
        user_id: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });
  });
}


