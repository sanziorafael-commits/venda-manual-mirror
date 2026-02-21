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
import { createUuidV7 } from '../utils/uuid.js';

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
      is_active: true,
      deleted_at: null,
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
      deleted_at: null,
    },
  });

  if (adminsCount > 0) {
    throw badRequest('Já existe um usuário admin cadastrado');
  }

  const user = await prisma.user.create({
    data: {
      id: createUuidV7(),
      role: UserRole.ADMIN,
      full_name: input.full_name.trim(),
      cpf: normalizeCpf(input.cpf),
      email: normalizeEmail(input.email),
      phone: normalizePhone(input.phone),
      passwordHash: await hashPassword(input.password),
      is_active: true,
    },
  });

  const tokens = await issueTokensForUser(user, {});

  return {
    user: mapPublicUser(user),
    tokens,
  };
}

export async function refreshSession(refresh_token: string, input: SessionInput) {
  const payload = verifyToken(refresh_token);

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

  const tokenHash = sha256(refresh_token);
  if (session.refreshTokenHash !== tokenHash) {
    throw unauthorized('Refresh token inválido');
  }

  if (!session.user.is_active || !session.user.passwordHash) {
    throw unauthorized('Conta inativa');
  }

  if (session.user.deleted_at) {
    throw unauthorized('Conta inativa');
  }

  if (session.user.role !== UserRole.ADMIN && session.user.company_id) {
    const company = await prisma.company.findFirst({
      where: {
        id: session.user.company_id,
        deleted_at: null,
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
    company_id: session.user.company_id,
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
      access_token: signAccessToken({
        sub: session.user.id,
        role: session.user.role,
        company_id: session.user.company_id,
      }),
      refresh_token: nextRefreshToken,
      expires_in: env.JWT_ACCESS_TOKEN_TTL,
    } satisfies TokenResponse,
  };
}

export async function logout(refresh_token: string) {
  const payload = verifyToken(refresh_token);

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
  return resendActivationInvite(actor, input.user_id);
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

export async function getMe(user_id: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: user_id,
      deleted_at: null,
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  return mapPublicUser(user);
}

export async function updateMe(
  user_id: string,
  input: UpdateMeInput,
) {
  const user = await prisma.user.findFirst({
    where: {
      id: user_id,
      deleted_at: null,
    },
  });

  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  if (user.role === UserRole.VENDEDOR) {
    throw forbidden('Este cargo não possui acesso ao dashboard');
  }

  if (input.new_password && input.new_password.length < 6) {
    throw badRequest('A senha deve ter no mínimo 6 caracteres');
  }

  const passwordHash = input.new_password ? await hashPassword(input.new_password) : undefined;

  const updated = await prisma.user.update({
    where: { id: user_id },
    data: {
      full_name: input.full_name,
      email: input.email ? normalizeEmail(input.email) : undefined,
      passwordHash,
    },
  });

  return mapPublicUser(updated);
}

async function issueTokensForUser(user: User, input: SessionInput) {
  const session = await prisma.session.create({
    data: {
      id: createUuidV7(),
      user_id: user.id,
      refreshTokenHash: `pending-${user.id}-${Date.now()}`,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: ttlToDate(env.JWT_REFRESH_TOKEN_TTL),
    },
  });

  const access_token = signAccessToken({
    sub: user.id,
    role: user.role,
    company_id: user.company_id,
  });

  const refresh_token = signRefreshToken({
    sub: user.id,
    role: user.role,
    company_id: user.company_id,
    sid: session.id,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: sha256(refresh_token),
    },
  });

  return {
    access_token,
    refresh_token,
    expires_in: env.JWT_ACCESS_TOKEN_TTL,
  } satisfies TokenResponse;
}

function mapPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    company_id: user.company_id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
    password_status:
      user.role === UserRole.VENDEDOR ? 'NOT_APPLICABLE' : user.passwordHash ? 'SET' : 'PENDING',
  };
}


