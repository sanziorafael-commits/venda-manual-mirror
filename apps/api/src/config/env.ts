import 'dotenv/config';

import { z } from 'zod';

const ttlPattern = /^\d+[smhd]$/;

function normalizeOrigin(urlValue: string) {
  try {
    return new URL(urlValue).origin;
  } catch {
    return null;
  }
}

function parseOrigins(raw?: string) {
  if (!raw) return [];

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter no mínimo 16 caracteres'),
  JWT_ACCESS_TOKEN_TTL: z.string().regex(ttlPattern, 'TTL inválido. Use formatos como 15m, 12h, 7d.').default('1h'),
  JWT_REFRESH_TOKEN_TTL: z.string().regex(ttlPattern, 'TTL inválido. Use formatos como 15m, 12h, 7d.').default('7d'),
  ACCOUNT_ACTIVATION_TOKEN_TTL: z.string().regex(ttlPattern, 'TTL inválido. Use formatos como 15m, 12h, 7d.').default('24h'),
  PASSWORD_RESET_TOKEN_TTL: z.string().regex(ttlPattern, 'TTL inválido. Use formatos como 15m, 12h, 7d.').default('1h'),
  MAIL_PROVIDER: z.enum(['resend', 'disabled']).default('disabled'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  APP_WEB_URL: z.string().url().optional(),
  APP_CORS_ORIGINS: z.string().optional(),
  APP_ACTIVATION_PATH: z.string().default('/ativar-conta'),
  APP_RESET_PASSWORD_PATH: z.string().default('/recuperar-senha'),
}).superRefine((values, context) => {
  if (values.MAIL_PROVIDER === 'resend') {
    if (!values.RESEND_API_KEY?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY é obrigatória quando MAIL_PROVIDER=resend',
      });
    }

    if (!values.MAIL_FROM?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['MAIL_FROM'],
        message: 'MAIL_FROM é obrigatório quando MAIL_PROVIDER=resend',
      });
    }

    if (!values.APP_WEB_URL?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['APP_WEB_URL'],
        message: 'APP_WEB_URL é obrigatória quando MAIL_PROVIDER=resend',
      });
    }
  }

  if (values.NODE_ENV === 'production') {
    const allowedOrigins = new Set<string>([
      ...parseOrigins(values.APP_CORS_ORIGINS),
      ...(values.APP_WEB_URL ? [new URL(values.APP_WEB_URL).origin] : []),
    ]);

    if (allowedOrigins.size === 0) {
      context.addIssue({
        code: 'custom',
        path: ['APP_CORS_ORIGINS'],
        message: 'Em produção, configure APP_CORS_ORIGINS ou APP_WEB_URL com ao menos uma origem válida',
      });
    }
  }
});

export const env = envSchema.parse(process.env);
