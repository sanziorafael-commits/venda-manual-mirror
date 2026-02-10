import { UserRole } from '@prisma/client';

import { isInvitableRole } from '../utils/user-role-policy.js';

export function shouldResendActivationInvite(
  existing: { role: UserRole; email: string | null; passwordHash: string | null },
  updated: { role: UserRole; email: string | null; passwordHash: string | null },
) {
  if (!isInvitableRole(updated.role) || updated.passwordHash) {
    return false;
  }

  return existing.role !== updated.role || existing.email !== updated.email;
}
