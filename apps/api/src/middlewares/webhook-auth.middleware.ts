import { createHmac, timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';
import { unauthorized } from '../utils/app-error.js';

const WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp';
const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';
const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

export function authenticateWebhook(req: Request, _res: Response, next: NextFunction) {
  try {
    const timestampHeader = req.header(WEBHOOK_TIMESTAMP_HEADER);
    const signatureHeader = req.header(WEBHOOK_SIGNATURE_HEADER);

    if (!timestampHeader || !signatureHeader) {
      next(unauthorized('Assinatura do webhook ausente'));
      return;
    }

    const unixSeconds = Number.parseInt(timestampHeader, 10);
    if (!Number.isFinite(unixSeconds)) {
      next(unauthorized('Timestamp do webhook invalido'));
      return;
    }

    const timestampMs = unixSeconds * 1000;
    if (Math.abs(Date.now() - timestampMs) > WEBHOOK_MAX_AGE_MS) {
      next(unauthorized('Timestamp do webhook expirado'));
      return;
    }

    if (!req.rawBody) {
      next(unauthorized('Payload bruto do webhook ausente'));
      return;
    }

    const receivedSignature = normalizeSignature(signatureHeader);
    if (!receivedSignature) {
      next(unauthorized('Assinatura do webhook invalida'));
      return;
    }

    const signedPayload = `${timestampHeader}.${req.rawBody}`;
    const expectedSignature = createHmac('sha256', env.WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    if (!areSignaturesEqual(expectedSignature, receivedSignature)) {
      next(unauthorized('Assinatura do webhook invalida'));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

function normalizeSignature(signatureHeader: string) {
  const trimmed = signatureHeader.trim();
  const signature = trimmed.startsWith('sha256=') ? trimmed.slice(7) : trimmed;

  if (!/^[a-fA-F0-9]{64}$/.test(signature)) {
    return null;
  }

  return signature.toLowerCase();
}

function areSignaturesEqual(expectedHex: string, receivedHex: string) {
  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(receivedHex, 'hex');

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
