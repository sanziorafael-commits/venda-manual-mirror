import { z } from 'zod';

export const conversationWebhookMessageSchema = z
  .object({
    timestamp_iso: z.string().datetime().optional(),
    timestampIso: z.string().datetime().optional(),
    sender_id: z.string().optional(),
    senderId: z.string().optional(),
    data: z.string().optional(),
    msg_type: z.string().optional(),
    msgType: z.string().optional(),
    flow_name: z.string().optional(),
    flowName: z.string().optional(),
    execution_id: z.string().optional(),
    executionId: z.string().optional(),
    message_id: z.string().optional(),
    messageId: z.string().optional(),
    mensagem: z.string().nullable().optional(),
    resposta: z.string().nullable().optional(),
    vendedor_nome: z.string().optional(),
    vendedorNome: z.string().optional(),
    vendedor_telefone: z.string().optional(),
    vendedorTelefone: z.string().optional(),
    supervisor: z.string().optional(),
    cliente_nome: z.string().optional(),
    clienteNome: z.string().optional(),
    leads_encontrados: z.string().nullable().optional(),
    leadsEncontrados: z.string().nullable().optional(),
    company_id: z.string().optional(),
    companyId: z.string().optional(),
    user_id: z.string().optional(),
    userId: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough();

export const conversationWebhookBatchSchema = z
  .object({
    mensagens: z.array(conversationWebhookMessageSchema).min(1).optional(),
    messages: z.array(conversationWebhookMessageSchema).min(1).optional(),
  })
  .refine((value) => Boolean(value.mensagens?.length || value.messages?.length), {
    message: "Informe ao menos uma mensagem em 'mensagens' ou 'messages'",
  })
  .passthrough();

export const conversationWebhookBodySchema = z.union([
  conversationWebhookMessageSchema,
  conversationWebhookBatchSchema,
]);

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const conversationListQuerySchema = z.object({
  q: z.string().optional(),
  companyId: z.string().cuid().optional(),
  vendedorNome: z.string().optional(),
  vendedorTelefone: z.string().optional(),
  clienteNome: z.string().optional(),
  startDate: dateQuerySchema.optional(),
  endDate: dateQuerySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export const conversationParamSchema = z.object({
  conversationId: z.string().uuid(),
});

export const conversationDetailQuerySchema = z.object({
  date: dateQuerySchema.optional(),
  startDate: dateQuerySchema.optional(),
  endDate: dateQuerySchema.optional(),
});

export type ConversationWebhookMessageInput = z.infer<typeof conversationWebhookMessageSchema>;
export type ConversationWebhookBodyInput = z.infer<typeof conversationWebhookBodySchema>;
export type ConversationListQueryInput = z.infer<typeof conversationListQuerySchema>;
export type ConversationDetailQueryInput = z.infer<typeof conversationDetailQuerySchema>;
