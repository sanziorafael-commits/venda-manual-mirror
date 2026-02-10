import { UserRole, type User } from '@prisma/client';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import type {
  ActivateAccountInput,
  AuthActor,
  BootstrapAdminInput,
  ForgotPasswordInput,
  LoginInput,
  PublicUser,
  ResetPasswordInput,
  ResendActivationInput,
  SessionInput,
  TokenResponse,
  UpdateMeInput,
} from '../types/auth.types.js';
import { accountPendingPassword, badRequest, forbidden, notFound, unauthorized } from '../utils/app-error.js';
import { sha256 } from '../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import { normalizeCpf, normalizeEmail, normalizePhone } from '../utils/normalizers.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { ttlToDate } from '../utils/time.js';
import { isInvitableRole } from '../utils/user-role-policy.js';

import {
  activateAccountWithToken,
  resendActivationInvite,
} from './account-activation.service.js';
import { requestPasswordReset, resetPasswordWithToken } from './password-reset.service.js';

export async function login(input: LoginInput) {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findFirst({
    where: {
      email,
      isActive: true,
      deletedAt: null,
      OR: [
        { role: UserRole.ADMIN },
        {
          company: {
            is: {
              deletedAt: null,
            },
          },
        },
      ],
    },
  });

  if (!user) {
    throw unauthorized('Credenciais inválidas');
  }

  if (user.role === UserRole.VENDEDOR) {
    throw forbidden('Este cargo não possui acesso ao dashboard');
  }

  if (!user.passwordHash) {
    if (isInvitableRole(user.role)) {
      throw accountPendingPassword();
    }

    throw unauthorized('Credenciais inválidas');
  }

  const isValidPassword = await verifyPassword(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw unauthorized('Credenciais inválidas');
  }

  const tokens = await issueTokensForUser(user, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  return {
    user: mapPublicUser(user),
    tokens,
  };
}

export async function activateAccount(input: ActivateAccountInput) {
  const passwordHash = await hashPassword(input.password);
  const user = await activateAccountWithToken(input.token, passwordHash);

  const tokens = await issueTokensForUser(user, {
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  return {
    user: mapPublicUser(user),
    tokens,
  };
}

export async function bootstrapAdmin(input: BootstrapAdminInput) {
  if (env.NODE_ENV === 'production') {
    throw forbidden('Endpoint de bootstrap admin desabilitado em produção');
  }

  const adminsCount = await prisma.user.count({
    where: {
      role: UserRole.ADMIN,
      deletedAt: null,
    },
  });

  if (adminsCount > 0) {
    throw badRequest('Já existe um usuário admin cadastrado');
  }

  const user = await prisma.user.create({
    data: {
      role: UserRole.ADMIN,
      fullName: input.fullName.trim(),
      cpf: normalizeCpf(input.cpf),
      email: normalizeEmail(input.email),
      phone: normalizePhone(input.phone),
      passwordHash: await hashPassword(input.password),
      isActive: true,
    },
  });

  const tokens = await issueTokensForUser(user, {});

  return {
    user: mapPublicUser(user),
    tokens,
  };
}

export async function refreshSession(refreshToken: string, input: SessionInput) {
  const payload = verifyToken(refreshToken);

  if (payload.type !== 'refresh' || typeof payload.sid !== 'string') {
    throw unauthorized('Refresh token inválido');
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw unauthorized('Sessão expirada');
  }

  const tokenHash = sha256(refreshToken);
  if (session.refreshTokenHash !== tokenHash) {
    throw unauthorized('Refresh token inválido');
  }

  if (!session.user.isActive || !session.user.passwordHash) {
    throw unauthorized('Conta inativa');
  }

  if (session.user.deletedAt) {
    throw unauthorized('Conta inativa');
  }

  if (session.user.role !== UserRole.ADMIN && session.user.companyId) {
    const company = await prisma.company.findFirst({
      where: {
        id: session.user.companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!company) {
      throw unauthorized('Conta inativa');
    }
  }

  if (session.user.role === UserRole.VENDEDOR) {
    throw forbidden('Este cargo não possui acesso ao dashboard');
  }

  const nextRefreshToken = signRefreshToken({
    sub: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    sid: session.id,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: sha256(nextRefreshToken),
      expiresAt: ttlToDate(env.JWT_REFRESH_TOKEN_TTL),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      revokedAt: null,
    },
  });

  return {
    user: mapPublicUser(session.user),
    tokens: {
      accessToken: signAccessToken({
        sub: session.user.id,
        role: session.user.role,
        companyId: session.user.companyId,
      }),
      refreshToken: nextRefreshToken,
      expiresIn: env.JWT_ACCESS_TOKEN_TTL,
    } satisfies TokenResponse,
  };
}

export async function logout(refreshToken: string) {
  const payload = verifyToken(refreshToken);

  if (payload.type !== 'refresh' || typeof payload.sid !== 'string') {
    throw unauthorized('Refresh token inválido');
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
  });

  if (!session) {
    return;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function resendActivation(actor: AuthActor, input: ResendActivationInput) {
  return resendActivationInvite(actor, input.userId);
}

export async function forgotPassword(input: ForgotPasswordInput) {
  await requestPasswordReset(input.email);
  return { ok: true };
}

export async function resetPassword(input: ResetPasswordInput) {
  const passwordHash = await hashPassword(input.password);
  await resetPasswordWithToken(input.token, passwordHash);
  return { ok: true };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  return mapPublicUser(user);
}

export async function updateMe(
  userId: string,
  input: UpdateMeInput,
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  if (user.role === UserRole.VENDEDOR) {
    throw forbidden('Este cargo não possui acesso ao dashboard');
  }

  if (input.newPassword && input.newPassword.length < 6) {
    throw badRequest('A senha deve ter no mínimo 6 caracteres');
  }

  const passwordHash = input.newPassword ? await hashPassword(input.newPassword) : undefined;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      email: input.email ? normalizeEmail(input.email) : undefined,
      passwordHash,
    },
  });

  return mapPublicUser(updated);
}

async function issueTokensForUser(user: User, input: SessionInput) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: `pending-${user.id}-${Date.now()}`,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: ttlToDate(env.JWT_REFRESH_TOKEN_TTL),
    },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    companyId: user.companyId,
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    role: user.role,
    companyId: user.companyId,
    sid: session.id,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: sha256(refreshToken),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_TOKEN_TTL,
  } satisfies TokenResponse;
}

function mapPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    companyId: user.companyId,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    passwordStatus:
      user.role === UserRole.VENDEDOR ? 'NOT_APPLICABLE' : user.passwordHash ? 'SET' : 'PENDING',
  };
}
