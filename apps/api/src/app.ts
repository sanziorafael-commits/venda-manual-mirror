import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { openApiDocument } from './docs/openapi.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFound } from './middlewares/not-found.middleware.js';
import { requestLog } from './middlewares/request-log.middleware.js';
import routes from './routes.js';

const app = express();

const DEV_DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

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

const allowedOrigins = new Set<string>([
  ...parseOrigins(env.APP_CORS_ORIGINS),
  ...(env.APP_WEB_URL ? [new URL(env.APP_WEB_URL).origin] : []),
  ...(env.NODE_ENV === 'production' ? [] : DEV_DEFAULT_ORIGINS),
]);
const isProduction = env.NODE_ENV === 'production';

if (isProduction && allowedOrigins.size === 0) {
  throw new Error('CORS em produção exige ao menos uma origem válida em APP_CORS_ORIGINS ou APP_WEB_URL');
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      if (!isProduction && allowedOrigins.size === 0) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin não permitida pelo CORS'));
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(compression());
app.use(requestLog);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV === 'development') {
  app.get('/api/openapi.json', (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
}

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
