import type { Request, Response } from 'express';

import {
  activateAccountSchema,
  bootstrapAdminSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  resendActivationSchema,
} from '../schemas/auth.schema.js';
import {
  activateAccount,
  bootstrapAdmin,
  forgotPassword,
  login,
  logout,
  refreshSession,
  resetPassword,
  resendActivation,
} from '../services/auth.service.js';
import { unauthorized } from '../utils/app-error.js';
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
} from '../utils/auth-cookies.js';

export async function bootstrapAdminHandler(req: Request, res: Response) {
  const payload = bootstrapAdminSchema.parse(req.body);
  const data = await bootstrapAdmin(payload);
  res.status(201).json({ data });
}

export async function loginHandler(req: Request, res: Response) {
  const payload = loginSchema.parse(req.body);

  const data = await login({
    ...payload,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  setAuthCookies(res, {
    access_token: data.tokens.access_token,
    refresh_token: data.tokens.refresh_token,
    user: {
      id: data.user.id,
      company_id: data.user.company_id,
      role: data.user.role,
      full_name: data.user.full_name,
      email: data.user.email,
    },
  });

  res.status(200).json({ data });
}

export async function refreshHandler(req: Request, res: Response) {
  const refresh_token = getRefreshTokenFromRequest(req);

  if (!refresh_token) {
    clearAuthCookies(res);
    throw unauthorized('Refresh token inv�lido');
  }

  try {
    const data = await refreshSession(refresh_token, {
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    setAuthCookies(res, {
      access_token: data.tokens.access_token,
      refresh_token: data.tokens.refresh_token,
      user: {
        id: data.user.id,
        company_id: data.user.company_id,
        role: data.user.role,
        full_name: data.user.full_name,
        email: data.user.email,
      },
    });

    res.status(200).json({ data });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
}

export async function logoutHandler(req: Request, res: Response) {
  const refresh_token = getRefreshTokenFromRequest(req);

  if (refresh_token) {
    try {
      await logout(refresh_token);
    } catch {
      // Logout deve ser idempotente para o frontend.
    }
  }

  clearAuthCookies(res);
  res.status(200).json({ data: { ok: true } });
}

export async function activateAccountHandler(req: Request, res: Response) {
  const payload = activateAccountSchema.parse(req.body);

  const data = await activateAccount({
    ...payload,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  setAuthCookies(res, {
    access_token: data.tokens.access_token,
    refresh_token: data.tokens.refresh_token,
    user: {
      id: data.user.id,
      company_id: data.user.company_id,
      role: data.user.role,
      full_name: data.user.full_name,
      email: data.user.email,
    },
  });

  res.status(200).json({ data });
}

export async function resendActivationHandler(req: Request, res: Response) {
  const authUser = req.authUser!;

  const payload = resendActivationSchema.parse(req.body);
  const data = await resendActivation(authUser, payload);

  res.status(200).json({ data });
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const payload = forgotPasswordSchema.parse(req.body);
  const data = await forgotPassword(payload);
  res.status(200).json({ data });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const payload = resetPasswordSchema.parse(req.body);
  const data = await resetPassword(payload);
  res.status(200).json({ data });
}


