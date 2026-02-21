import type { UserRole } from '@prisma/client';

export type JwtTokenType = 'access' | 'refresh';

export type BaseTokenPayload = {
  sub: string;
  role: UserRole;
  company_id: string | null;
};

export type AccessTokenPayload = BaseTokenPayload & {
  type: 'access';
};

export type RefreshTokenPayload = BaseTokenPayload & {
  type: 'refresh';
  sid: string;
};


