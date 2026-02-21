import { z } from "zod";

export const conversationListItemSchema = z.object({
  id: z.string().min(1),
  company_id: z.string().nullable(),
  company_name: z.string().nullable(),
  vendedor_nome: z.string().min(1),
  vendedor_telefone: z.string().nullable(),
  total_interacoes: z.number().int().nonnegative(),
  ultima_interacao_em: z.string().nullable(),
  primeira_interacao_em: z.string().nullable(),
});

export const conversationListMetaSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().positive(),
});

export const conversationsApiResponseSchema = z.object({
  data: z.array(conversationListItemSchema),
  meta: conversationListMetaSchema,
});

export const conversationTimelineMessageSchema = z.object({
  id: z.string().min(1),
  historico_id: z.string().min(1),
  sender: z.enum(["vendedor", "handsell"]),
  text: z.string().min(1),
  message_type: z.string().min(1),
  timestamp: z.string(),
  cliente_nome: z.string().nullable(),
});

export const conversationDetailSchema = z.object({
  id: z.string().min(1),
  company_id: z.string().nullable(),
  company_name: z.string().nullable(),
  vendedor_nome: z.string().min(1),
  vendedor_telefone: z.string().nullable(),
  cliente_nome: z.string().nullable(),
  selected_date: z.string().nullable(),
  available_dates: z.array(z.string()),
  total_mensagens: z.number().int().nonnegative(),
  mensagens: z.array(conversationTimelineMessageSchema),
});

export const conversationDetailApiResponseSchema = z.object({
  data: conversationDetailSchema,
});

export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
export type ConversationListMeta = z.infer<typeof conversationListMetaSchema>;
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

