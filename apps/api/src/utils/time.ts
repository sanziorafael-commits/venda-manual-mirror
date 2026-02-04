import { badRequest } from './app-error.js';

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function ttlToDate(ttl: string) {
  const match = ttl.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw badRequest('Formato de TTL inválido. Use padrões como 15m, 12h, 7d.');
  }

  const amount = Number(match[1]);
  const unit = match[2];

  return new Date(Date.now() + amount * UNIT_MS[unit]);
}
