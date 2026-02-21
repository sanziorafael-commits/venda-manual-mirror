import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        user_id: string;
        role: UserRole;
        company_id: string | null;
      };
    }
  }
}

export {};


