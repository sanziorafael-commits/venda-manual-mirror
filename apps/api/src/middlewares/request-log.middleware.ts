import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { logger } from '../lib/logger.js';

export function requestLog(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id') || randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      },
      'request completed',
    );
  });

  next();
}


