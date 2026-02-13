import type { Request, Response } from 'express';

import {
  conversationDetailQuerySchema,
  conversationListQuerySchema,
  conversationParamSchema,
  conversationWebhookBodySchema,
  type ConversationWebhookBodyInput,
  type ConversationWebhookMessageInput,
} from '../schemas/conversation.schema.js';
import { getConversationById, listConversations } from '../services/conversation-query.service.js';
import { ingestConversationWebhookMessages } from '../services/conversation.service.js';
import { getAuthUserOrThrow } from '../utils/auth-user.js';

export async function conversationWebhookHandler(req: Request, res: Response) {
  const payload = conversationWebhookBodySchema.parse(req.body);
  const batchMessages = extractBatchMessages(payload);
  const messages = batchMessages ?? [payload];

  const result = await ingestConversationWebhookMessages(messages);

  res.status(201).json({
    data: result,
  });
}

export async function listConversationsHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const query = conversationListQuerySchema.parse(req.query);
  const result = await listConversations(authUser, query);

  res.status(200).json({
    data: result.items,
    meta: result.meta,
  });
}

export async function getConversationByIdHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const { conversationId } = conversationParamSchema.parse(req.params);
  const query = conversationDetailQuerySchema.parse(req.query);
  const data = await getConversationById(authUser, conversationId, query);

  res.status(200).json({ data });
}

function extractBatchMessages(payload: ConversationWebhookBodyInput) {
  if (Array.isArray(payload.mensagens)) {
    return payload.mensagens as ConversationWebhookMessageInput[];
  }

  if (Array.isArray(payload.messages)) {
    return payload.messages as ConversationWebhookMessageInput[];
  }

  return null;
}
