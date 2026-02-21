import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';
import type {
  AccessTokenPayload,
  BaseTokenPayload,
  JwtTokenType,
  RefreshTokenPayload,
} from '../types/jwt.types.js';

import { unauthorized } from './app-error.js';

export function signAccessToken(payload: BaseTokenPayload) {
  return jwt.sign(
    {
      ...payload,
      type: 'access',
    } satisfies AccessTokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_TOKEN_TTL as SignOptions['expiresIn'] },
  );
}

export function signRefreshToken(payload: BaseTokenPayload & { sid: string }) {
  return jwt.sign(
    {
      ...payload,
      type: 'refresh',
    } satisfies RefreshTokenPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_TOKEN_TTL as SignOptions['expiresIn'] },
  );
}

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === 'string') {
      throw unauthorized('Token inválido');
    }

    return decoded;
  } catch {
    throw unauthorized('Token inválido ou expirado');
  }
}

export function assertTokenType(payload: JwtPayload, type: JwtTokenType) {
  if (payload.type !== type) {
    throw unauthorized('Tipo de token inválido');
  }
}


