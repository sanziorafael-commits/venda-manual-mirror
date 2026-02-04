import type { Request, Response } from 'express';

import {
  activateAccountSchema,
  bootstrapAdminSchema,
  loginSchema,
  refreshTokenSchema,
  resendActivationSchema,
} from '../schemas/auth.schema.js';
import {
  activateAccount,
  bootstrapAdmin,
  login,
  logout,
  refreshSession,
  resendActivation,
} from '../services/auth.service.js';
import { unauthorized } from '../utils/app-error.js';

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

  res.status(200).json({ data });
}

export async function refreshHandler(req: Request, res: Response) {
  const payload = refreshTokenSchema.parse(req.body);

  const data = await refreshSession(payload.refreshToken, {
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  res.status(200).json({ data });
}

export async function logoutHandler(req: Request, res: Response) {
  const payload = refreshTokenSchema.parse(req.body);

  await logout(payload.refreshToken);
  res.status(200).json({ data: { ok: true } });
}

export async function activateAccountHandler(req: Request, res: Response) {
  const payload = activateAccountSchema.parse(req.body);

  const data = await activateAccount({
    ...payload,
    userAgent: req.get('user-agent'),
    ipAddress: req.ip,
  });

  res.status(200).json({ data });
}

export async function resendActivationHandler(req: Request, res: Response) {
  const authUser = req.authUser;
  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  const payload = resendActivationSchema.parse(req.body);
  const data = await resendActivation(authUser, payload);

  res.status(200).json({ data });
}
