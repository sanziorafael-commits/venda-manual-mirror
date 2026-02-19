import { UserRole } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { normalizePhone } from '../utils/normalizers.js';

type ResolveSellerScopeInput = {
  userId: string | null;
  companyId: string | null;
  sellerPhone: string | null;
};

export async function resolveSellerScopeByPhone(input: ResolveSellerScopeInput) {
  let resolvedUserId = normalizeText(input.userId);
  let resolvedCompanyId = normalizeText(input.companyId);
  const normalizedSellerPhone = normalizePhone(input.sellerPhone ?? '');

  if (resolvedUserId) {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: resolvedUserId,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (existingUser) {
      resolvedUserId = existingUser.id;
      if (!resolvedCompanyId && existingUser.companyId) {
        resolvedCompanyId = existingUser.companyId;
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
          companyId: resolvedCompanyId,
          deletedAt: null,
        },
        select: {
          id: true,
          companyId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (user) {
        resolvedUserId = user.id;
        resolvedCompanyId = user.companyId;
      }
    } else {
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.VENDEDOR, UserRole.SUPERVISOR],
          },
          phone: normalizedSellerPhone,
          deletedAt: null,
        },
        select: {
          id: true,
          companyId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 2,
      });

      if (users.length === 1) {
        resolvedUserId = users[0].id;
        resolvedCompanyId = users[0].companyId;
      }
    }
  }

  return {
    userId: resolvedUserId,
    companyId: resolvedCompanyId,
    sellerPhone: normalizedSellerPhone || null,
  };
}

function normalizeText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
