import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '../lib/logger.js';
import { AppError } from '../utils/app-error.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Dados da requisi\u00e7\u00e3o inv\u00e1lidos',
        details: err.flatten(),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.map((field) => normalizeTargetField(String(field)))
      : [];

    return res.status(409).json({
      error: {
        code: 'conflict',
        message: mapUniqueConstraintMessage(target),
        details: {
          target,
        },
      },
    });
  }

  logger.error({ err }, 'unhandled error');

  return res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Erro interno inesperado',
    },
  });
}

function mapUniqueConstraintMessage(target: string[]) {
  const normalizedTarget = target.map((field) => field.toLowerCase());

  if (normalizedTarget.includes('cnpj')) {
    return 'CNPJ j\u00e1 cadastrado';
  }

  if (normalizedTarget.includes('cpf')) {
    return 'CPF j\u00e1 cadastrado';
  }

  if (normalizedTarget.includes('email')) {
    return 'E-mail j\u00e1 cadastrado';
  }

  if (normalizedTarget.includes('phone') && normalizedTarget.includes('companyid')) {
    return 'Celular j\u00e1 cadastrado para esta empresa';
  }

  if (normalizedTarget.includes('phone')) {
    return 'Celular j\u00e1 cadastrado';
  }

  return 'J\u00e1 existe um registro com os dados informados';
}

function normalizeTargetField(field: string) {
  return field.replace(/['"`]/g, '').trim();
}


