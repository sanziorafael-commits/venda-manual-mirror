export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

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
  return onlyDigits(phone);
}
