import { z } from "zod";

export const conversationListItemSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().nullable(),
  companyName: z.string().nullable(),
  vendedorNome: z.string().min(1),
  vendedorTelefone: z.string().nullable(),
  ultimoClienteNome: z.string().nullable(),
  totalInteracoes: z.number().int().nonnegative(),
  clientesUnicos: z.number().int().nonnegative(),
  ultimaInteracaoEm: z.string().nullable(),
  primeiraInteracaoEm: z.string().nullable(),
});

export const conversationListMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
});

export const conversationsApiResponseSchema = z.object({
  data: z.array(conversationListItemSchema),
  meta: conversationListMetaSchema,
});

export const conversationTimelineMessageSchema = z.object({
  id: z.string().min(1),
  historicoId: z.string().min(1),
  sender: z.enum(["vendedor", "handsell"]),
  text: z.string().min(1),
  messageType: z.string().min(1),
  timestamp: z.string(),
  clienteNome: z.string().nullable(),
});

export const conversationDetailSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().nullable(),
  companyName: z.string().nullable(),
  vendedorNome: z.string().min(1),
  vendedorTelefone: z.string().nullable(),
  clienteNome: z.string().nullable(),
  selectedDate: z.string().nullable(),
  availableDates: z.array(z.string()),
  totalMensagens: z.number().int().nonnegative(),
  mensagens: z.array(conversationTimelineMessageSchema),
});

export const conversationDetailApiResponseSchema = z.object({
  data: conversationDetailSchema,
});

export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
export type ConversationListMeta = z.infer<typeof conversationListMetaSchema>;
export type ConversationDetail = z.infer<typeof conversationDetailSchema>;
