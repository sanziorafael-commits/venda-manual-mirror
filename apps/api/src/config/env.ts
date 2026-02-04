import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default('info'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter no mínimo 16 caracteres'),
  JWT_ACCESS_TOKEN_TTL: z.string().default('1h'),
  JWT_REFRESH_TOKEN_TTL: z.string().default('7d'),
  ACCOUNT_ACTIVATION_TOKEN_TTL: z.string().default('24h'),
});

export const env = envSchema.parse(process.env);
