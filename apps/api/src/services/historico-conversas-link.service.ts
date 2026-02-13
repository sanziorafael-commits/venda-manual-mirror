import { prisma } from '../lib/prisma.js';
import { normalizePhone } from '../utils/normalizers.js';

type LinkConversationHistoryInput = {
  userId: string;
  companyId: string | null;
  phone: string;
};

export async function linkConversationHistoryByPhone({
  userId,
  companyId,
  phone,
}: LinkConversationHistoryInput) {
  if (!companyId) {
    return 0;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return 0;
  }

  const result = await prisma.historico_conversas.updateMany({
    where: {
      vendedor_telefone: normalizedPhone,
      OR: [{ company_id: null }, { company_id: companyId }],
    },
    data: {
      user_id: userId,
      company_id: companyId,
    },
  });

  return result.count;
}
