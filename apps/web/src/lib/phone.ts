function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhoneDigits(value: string) {
  return onlyDigits(value).slice(0, 13);
}

export function formatPhoneInput(value: string) {
  const digits = normalizePhoneDigits(value);

  if (digits.length <= 2) return digits;

  if (digits.length <= 11) {
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  const countryCode = digits.slice(0, 2);
  const localDigits = digits.slice(2);

  if (localDigits.length <= 2) {
    return `+${countryCode} (${localDigits}`;
  }

  if (localDigits.length <= 6) {
    return `+${countryCode} (${localDigits.slice(0, 2)}) ${localDigits.slice(2)}`;
  }

  if (localDigits.length <= 10) {
    return `+${countryCode} (${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
  }

  return `+${countryCode} (${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7, 11)}`;
}

export function formatPhoneDisplay(value: string) {
  const digits = onlyDigits(value);

  if (digits.length === 13) {
    return digits.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, "+$1 ($2) $3-$4");
  }

  if (digits.length === 12) {
    return digits.replace(/^(\d{2})(\d{2})(\d{4})(\d{4})$/, "+$1 ($2) $3-$4");
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return value;
}
