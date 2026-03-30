import { prisma } from '../lib/prisma.js';
import { normalizePhone } from '../utils/normalizers.js';

type ResolveSellerScopeInput = {
  user_id: string | null;
  company_id: string | null;
  seller_phone: string | null;
};

type ResolveSellerScopeResult = {
  user_id: string | null;
  company_id: string | null;
  seller_phone: string | null;
  seller_name: string | null;
};

export async function resolveSellerScopeByPhone(input: ResolveSellerScopeInput) {
  let resolvedUserId = normalizeText(input.user_id);
  let resolvedCompanyId = normalizeText(input.company_id);
  let resolvedSellerName: string | null = null;
  const normalizedSellerPhone = normalizePhone(input.seller_phone ?? '');

  if (resolvedUserId) {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: resolvedUserId,
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        company_id: true,
        full_name: true,
      },
    });

    if (existingUser) {
      resolvedUserId = existingUser.id;
      resolvedSellerName = existingUser.full_name;
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
          phone: normalizedSellerPhone,
          company_id: resolvedCompanyId,
          is_active: true,
          deleted_at: null,
        },
        select: {
          id: true,
          company_id: true,
          full_name: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (user) {
        resolvedUserId = user.id;
        resolvedCompanyId = user.company_id;
        resolvedSellerName = user.full_name;
      }
    } else {
      const users = await prisma.user.findMany({
        where: {
          phone: normalizedSellerPhone,
          is_active: true,
          deleted_at: null,
        },
        select: {
          id: true,
          company_id: true,
          full_name: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 2,
      });

      if (users.length === 1) {
        resolvedUserId = users[0].id;
        resolvedCompanyId = users[0].company_id;
        resolvedSellerName = users[0].full_name;
      }
    }
  }

  const result: ResolveSellerScopeResult = {
    user_id: resolvedUserId,
    company_id: resolvedCompanyId,
    seller_phone: normalizedSellerPhone || null,
    seller_name: resolvedSellerName,
  };

  return result;
}

function normalizeText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}


