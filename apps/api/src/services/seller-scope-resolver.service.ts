import { UserRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { normalizePhone } from '../utils/normalizers.js';

type ResolveSellerScopeInput = {
  user_id: string | null;
  company_id: string | null;
  seller_phone: string | null;
};

export async function resolveSellerScopeByPhone(input: ResolveSellerScopeInput) {
  let resolvedUserId = normalizeText(input.user_id);
  let resolvedCompanyId = normalizeText(input.company_id);
  const normalizedSellerPhone = normalizePhone(input.seller_phone ?? '');

  if (resolvedUserId) {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: resolvedUserId,
        deleted_at: null,
      },
      select: {
        id: true,
        company_id: true,
      },
    });

    if (existingUser) {
      resolvedUserId = existingUser.id;
      if (!resolvedCompanyId && existingUser.company_id) {
        resolvedCompanyId = existingUser.company_id;
      }
    } else {
      resolvedUserId = null;
    }
  }

  if (!resolvedUserId && normalizedSellerPhone) {
    if (resolvedCompanyId) {
      const user = await prisma.user.findFirst({
        where: {
          role: {
            in: [UserRole.VENDEDOR, UserRole.SUPERVISOR],
          },
          phone: normalizedSellerPhone,
          company_id: resolvedCompanyId,
          deleted_at: null,
        },
        select: {
          id: true,
          company_id: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (user) {
        resolvedUserId = user.id;
        resolvedCompanyId = user.company_id;
      }
    } else {
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.VENDEDOR, UserRole.SUPERVISOR],
          },
          phone: normalizedSellerPhone,
          deleted_at: null,
        },
        select: {
          id: true,
          company_id: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 2,
      });

      if (users.length === 1) {
        resolvedUserId = users[0].id;
        resolvedCompanyId = users[0].company_id;
      }
    }
  }

  return {
    user_id: resolvedUserId,
    company_id: resolvedCompanyId,
    seller_phone: normalizedSellerPhone || null,
  };
}

function normalizeText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}


