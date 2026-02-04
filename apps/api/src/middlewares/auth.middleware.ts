import { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { forbidden, unauthorized } from '../utils/app-error.js';
import { assertTokenType, verifyToken } from '../utils/jwt.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw unauthorized('Token Bearer ausente');
  }

  const payload = verifyToken(token);
  assertTokenType(payload, 'access');

  if (!payload.sub || !payload.role) {
    throw unauthorized('Payload de token inválido');
  }

  req.authUser = {
    userId: payload.sub,
    role: payload.role as UserRole,
    companyId: typeof payload.companyId === 'string' ? payload.companyId : null,
  };

  next();
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authUser = req.authUser;

    if (!authUser) {
      throw unauthorized('Autenticação obrigatória');
    }

    if (!roles.includes(authUser.role)) {
      throw forbidden('Permissão insuficiente');
    }

    next();
  };
}
