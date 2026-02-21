import { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { forbidden, unauthorized } from '../utils/app-error.js';
import { getAccessTokenFromRequest } from '../utils/auth-cookies.js';
import { assertTokenType, verifyToken } from '../utils/jwt.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearerToken?.trim() || getAccessTokenFromRequest(req) || null;

    if (!token) {
      next(unauthorized('Token de acesso ausente'));
      return;
    }

    const payload = verifyToken(token);
    assertTokenType(payload, 'access');

    if (!payload.sub || !payload.role) {
      next(unauthorized('Payload de token inválido'));
      return;
    }

    req.authUser = {
      user_id: payload.sub,
      role: payload.role as UserRole,
      company_id: typeof payload.company_id === 'string' ? payload.company_id : null,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser;

      if (!authUser) {
        next(unauthorized('Autenticação obrigatória'));
        return;
      }

      if (!roles.includes(authUser.role)) {
        next(forbidden('Permissão insuficiente'));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}


