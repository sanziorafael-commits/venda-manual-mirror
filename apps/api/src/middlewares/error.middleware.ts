import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isHttpError(err)) {
    return res.status(err.status).json({
      error: {
        code: 'http_error',
        message: err.message,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_error',
        message: 'Invalid request data',
        details: err.flatten(),
      },
    });
  }

  console.error(err);

  return res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Unexpected server error',
    },
  });
}

function isHttpError(err: unknown): err is Error & { status: number } {
  return (
    err instanceof Error &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
  );
}
