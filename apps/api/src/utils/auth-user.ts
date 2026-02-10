import type { Request } from 'express';

import { unauthorized } from './app-error.js';

type AuthUser = NonNullable<Request['authUser']>;

export function getAuthUserOrThrow(req: Request): AuthUser {
  const authUser = req.authUser;

  if (!authUser) {
    throw unauthorized('Autenticação obrigatória');
  }

  return authUser;
}
