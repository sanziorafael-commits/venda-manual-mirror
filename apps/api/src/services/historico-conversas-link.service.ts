import { prisma } from '../lib/prisma.js';
import { normalizePhone } from '../utils/normalizers.js';

type LinkConversationHistoryInput = {
  user_id: string;
  company_id: string | null;
  phone: string;
};

export async function linkConversationHistoryByPhone({
  user_id,
  company_id,
  phone,
}: LinkConversationHistoryInput) {
  if (!company_id) {
    return 0;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return 0;
  }

  const result = await prisma.historico_conversas.updateMany({
    where: {
      vendedor_telefone: normalizedPhone,
      OR: [{ company_id: null }, { company_id: company_id }],
    },
    data: {
      user_id: user_id,
      company_id: company_id,
    },
  });

  return result.count;
}


