export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

const BRAZIL_DDI = '55';
const BRAZIL_LOCAL_LENGTHS_WITH_DDD = new Set([10, 11]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeCpf(cpf: string) {
  return onlyDigits(cpf);
}

export function normalizeCnpj(cnpj: string) {
  return onlyDigits(cnpj);
}

export function normalizePhone(phone: string) {
  const digits = onlyDigits(phone);

  if (!digits) {
    return '';
  }

  if (digits.startsWith(BRAZIL_DDI)) {
    return digits;
  }

  if (BRAZIL_LOCAL_LENGTHS_WITH_DDD.has(digits.length)) {
    return `${BRAZIL_DDI}${digits}`;
  }

  return digits;
}


