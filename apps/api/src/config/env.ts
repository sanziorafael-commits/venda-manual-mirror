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

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.string().default('info'),
    DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL v�lida'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter no m�nimo 16 caracteres'),
    JWT_ACCESS_TOKEN_TTL: z
      .string()
      .regex(ttlPattern, 'TTL inv�lido. Use formatos como 15m, 12h, 7d.')
      .default('1h'),
    JWT_REFRESH_TOKEN_TTL: z
      .string()
      .regex(ttlPattern, 'TTL inv�lido. Use formatos como 15m, 12h, 7d.')
      .default('7d'),
    ACCOUNT_ACTIVATION_TOKEN_TTL: z
      .string()
      .regex(ttlPattern, 'TTL inv�lido. Use formatos como 15m, 12h, 7d.')
      .default('24h'),
    PASSWORD_RESET_TOKEN_TTL: z
      .string()
      .regex(ttlPattern, 'TTL inv�lido. Use formatos como 15m, 12h, 7d.')
      .default('1h'),
    MAIL_PROVIDER: z.enum(['resend', 'disabled']).default('disabled'),
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().email().optional(),
    APP_WEB_URL: z.string().url().optional(),
    APP_CORS_ORIGINS: z.string().optional(),
    AUTH_COOKIE_DOMAIN: z.string().optional(),
    APP_ACTIVATION_PATH: z.string().default('/login/activate-account'),
    APP_RESET_PASSWORD_PATH: z.string().default('/login/reset-password'),
    AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    AUTH_FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    AUTH_BOOTSTRAP_ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(3_600_000),
    AUTH_BOOTSTRAP_ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
    STORAGE_PROVIDER: z.enum(['disabled', 'gcs']).default('disabled'),
    STORAGE_UPLOAD_URL_TTL: z
      .string()
      .regex(ttlPattern, 'TTL inv�lido. Use formatos como 15m, 12h, 7d.')
      .default('15m'),
    STORAGE_READ_URL_TTL: z
      .string()
      .regex(ttlPattern, 'TTL inv�lido. Use formatos como 15m, 12h, 7d.')
      .default('1h'),
    GCS_BUCKET_NAME: z.string().optional(),
    GCS_PROJECT_ID: z.string().optional(),
    GCS_CLIENT_EMAIL: z.string().email().optional(),
    GCS_PRIVATE_KEY: z.string().optional(),
    GCS_CREDENTIALS_FILE: z.string().optional(),
    GCS_CREDENTIALS_JSON: z.string().optional(),
    GCS_CREDENTIALS_BASE64: z.string().optional(),
    GCS_PUBLIC_BASE_URL: z.string().url().optional(),
  })
  .superRefine((values, context) => {
    if (values.MAIL_PROVIDER === 'resend') {
      if (!values.RESEND_API_KEY?.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['RESEND_API_KEY'],
          message: 'RESEND_API_KEY � obrigat�ria quando MAIL_PROVIDER=resend',
        });
      }

      if (!values.MAIL_FROM?.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['MAIL_FROM'],
          message: 'MAIL_FROM � obrigat�rio quando MAIL_PROVIDER=resend',
        });
      }

      if (!values.APP_WEB_URL?.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['APP_WEB_URL'],
          message: 'APP_WEB_URL � obrigat�ria quando MAIL_PROVIDER=resend',
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
          message:
            'Em produ��o, configure APP_CORS_ORIGINS ou APP_WEB_URL com ao menos uma origem v�lida',
        });
      }
    }

    if (values.STORAGE_PROVIDER === 'gcs') {
      if (!values.GCS_BUCKET_NAME?.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['GCS_BUCKET_NAME'],
          message: 'GCS_BUCKET_NAME � obrigat�rio quando STORAGE_PROVIDER=gcs',
        });
      }
    }

    const hasClientEmail = Boolean(values.GCS_CLIENT_EMAIL?.trim());
    const hasPrivateKey = Boolean(values.GCS_PRIVATE_KEY?.trim());

    if (hasClientEmail !== hasPrivateKey) {
      context.addIssue({
        code: 'custom',
        path: ['GCS_PRIVATE_KEY'],
        message: 'GCS_CLIENT_EMAIL e GCS_PRIVATE_KEY devem ser informados juntos',
      });
    }
  });

export const env = envSchema.parse(process.env);
