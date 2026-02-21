import { LocatedClientStatus } from '@prisma/client';
import { z } from 'zod';

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const locatedClientListQuerySchema = z.object({
  seller: z.string().optional(),
  status: z.nativeEnum(LocatedClientStatus).optional(),
  company_id: z.string().uuid().optional(),
  start_date: dateQuerySchema.optional(),
  end_date: dateQuerySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(10),
});

export const locatedClientParamSchema = z.object({
  located_client_id: z.string().uuid(),
});

export const locatedClientStatusUpdateSchema = z.object({
  status: z.nativeEnum(LocatedClientStatus),
});

export const locatedClientWebhookMessageSchema = z
  .object({
    seller_phone: z.string().optional(),
    vendedor_telefone: z.string().optional(),
    customer_name: z.string().optional(),
    cliente_nome: z.string().optional(),
    city: z.string().optional(),
    cidade: z.string().optional(),
    state: z.string().optional(),
    estado: z.string().optional(),
    address: z.string().optional(),
    endereco: z.string().optional(),
    map_url: z.string().nullable().optional(),
    identified_at: z.string().optional(),
    timestamp_iso: z.string().optional(),
    company_id: z.string().optional(),
    user_id: z.string().optional(),
    source: z.string().optional(),
  })
  .superRefine((value, context) => {
    const seller_phone =
      value.seller_phone ??
      value.vendedor_telefone ??
      null;
    const customer_name =
      value.customer_name ?? value.cliente_nome ?? null;
    const city = value.city ?? value.cidade;
    const state = value.state ?? value.estado;
    const address = value.address ?? value.endereco;

    if (!seller_phone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone do vendedor e obrigatorio',
      });
    }

    if (!customer_name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nome do cliente e obrigatorio',
      });
    }

    if (!city) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cidade e obrigatoria',
      });
    }

    if (!state) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Estado e obrigatorio',
      });
    }

    if (!address) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Endereco e obrigatorio',
      });
    }
  })
  .passthrough();

export const locatedClientWebhookBatchSchema = z
  .object({
    clientes: z.array(locatedClientWebhookMessageSchema).min(1).optional(),
    items: z.array(locatedClientWebhookMessageSchema).min(1).optional(),
    messages: z.array(locatedClientWebhookMessageSchema).min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.clientes?.length || value.items?.length || value.messages?.length),
    {
      message: "Informe ao menos um item em 'clientes', 'items' ou 'messages'",
    },
  )
  .passthrough();

export const locatedClientWebhookBodySchema = z.union([
  locatedClientWebhookMessageSchema,
  locatedClientWebhookBatchSchema,
]);

export type LocatedClientListQueryInput = z.infer<typeof locatedClientListQuerySchema>;
export type LocatedClientStatusUpdateInput = z.infer<typeof locatedClientStatusUpdateSchema>;
export type LocatedClientWebhookMessageInput = z.infer<typeof locatedClientWebhookMessageSchema>;
export type LocatedClientWebhookBodyInput = z.infer<typeof locatedClientWebhookBodySchema>;


