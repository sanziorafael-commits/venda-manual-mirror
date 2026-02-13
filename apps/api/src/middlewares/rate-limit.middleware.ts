import type { NextFunction, Request, Response } from 'express';

import { logger } from '../lib/logger.js';
import { tooManyRequests } from '../utils/app-error.js';

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function createIpRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = resolveClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;

    const currentBucket = buckets.get(key);
    const bucket =
      currentBucket && currentBucket.resetAt > now
        ? currentBucket
        : {
            count: 0,
            resetAt: now + options.windowMs,
          };

    bucket.count += 1;
    buckets.set(key, bucket);

    const retryAfterSeconds = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000));
    const remaining = Math.max(0, options.max - bucket.count);

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      logger.warn(
        {
          ip,
          path: req.originalUrl,
          method: req.method,
          keyPrefix: options.keyPrefix,
          retryAfterSeconds,
        },
        'request blocked by rate limit',
      );

      next(
        tooManyRequests(options.message, {
          retryAfterSeconds,
        }),
      );
      return;
    }

    maybePruneBuckets(now);
    next();
  };
}

function resolveClientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function maybePruneBuckets(now: number) {
  if (buckets.size < 5_000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
