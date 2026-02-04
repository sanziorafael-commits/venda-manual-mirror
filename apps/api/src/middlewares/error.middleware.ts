import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

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
        message: 'Dados da requisição inválidos',
        details: err.flatten(),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.map(String) : [];

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

  console.error(err);

  return res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Erro interno inesperado',
    },
  });
}

function mapUniqueConstraintMessage(target: string[]) {
  if (target.includes('cnpj')) {
    return 'CNPJ já cadastrado';
  }

  if (target.includes('cpf')) {
    return 'CPF já cadastrado';
  }

  if (target.includes('email')) {
    return 'E-mail já cadastrado';
  }

  if (target.includes('phone') && target.includes('companyId')) {
    return 'Celular já cadastrado para esta empresa';
  }

  if (target.includes('phone')) {
    return 'Celular já cadastrado';
  }

  return 'Já existe um registro com os dados informados';
}
