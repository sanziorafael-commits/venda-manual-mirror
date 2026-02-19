import type { Request, Response } from 'express';

import {
  locatedClientListQuerySchema,
  locatedClientParamSchema,
  locatedClientStatusUpdateSchema,
  locatedClientWebhookBodySchema,
  type LocatedClientWebhookBodyInput,
  type LocatedClientWebhookMessageInput,
} from '../schemas/located-client.schema.js';
import {
  deleteLocatedClient,
  getLocatedClientById,
  ingestLocatedClientWebhookMessages,
  listLocatedClients,
  updateLocatedClientStatus,
} from '../services/located-client.service.js';
import { getAuthUserOrThrow } from '../utils/auth-user.js';

export async function locatedClientWebhookHandler(req: Request, res: Response) {
  const payload = locatedClientWebhookBodySchema.parse(req.body);
  const batchMessages = extractBatchMessages(payload);
  const messages = batchMessages ?? [payload];
  const data = await ingestLocatedClientWebhookMessages(messages);

  res.status(201).json({ data });
}

export async function listLocatedClientsHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const query = locatedClientListQuerySchema.parse(req.query);
  const result = await listLocatedClients(authUser, query);

  res.status(200).json({
    data: result.items,
    meta: result.meta,
  });
}

export async function getLocatedClientByIdHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const { locatedClientId } = locatedClientParamSchema.parse(req.params);
  const data = await getLocatedClientById(authUser, locatedClientId);

  res.status(200).json({ data });
}

export async function updateLocatedClientStatusHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const { locatedClientId } = locatedClientParamSchema.parse(req.params);
  const payload = locatedClientStatusUpdateSchema.parse(req.body);
  const data = await updateLocatedClientStatus(authUser, locatedClientId, payload);

  res.status(200).json({ data });
}

export async function deleteLocatedClientHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const { locatedClientId } = locatedClientParamSchema.parse(req.params);
  await deleteLocatedClient(authUser, locatedClientId);

  res.status(200).json({
    data: {
      ok: true,
    },
  });
}

function extractBatchMessages(payload: LocatedClientWebhookBodyInput) {
  if (Array.isArray(payload.clientes)) {
    return payload.clientes as LocatedClientWebhookMessageInput[];
  }

  if (Array.isArray(payload.items)) {
    return payload.items as LocatedClientWebhookMessageInput[];
  }

  if (Array.isArray(payload.messages)) {
    return payload.messages as LocatedClientWebhookMessageInput[];
  }

  return null;
}
