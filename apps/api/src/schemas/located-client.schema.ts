import { LocatedClientStatus } from '@prisma/client';
import { z } from 'zod';

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const locatedClientListQuerySchema = z.object({
  seller: z.string().optional(),
  status: z.nativeEnum(LocatedClientStatus).optional(),
  companyId: z.string().cuid().optional(),
  startDate: dateQuerySchema.optional(),
  endDate: dateQuerySchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export const locatedClientParamSchema = z.object({
  locatedClientId: z.string().uuid(),
});

export const locatedClientStatusUpdateSchema = z.object({
  status: z.nativeEnum(LocatedClientStatus),
});

export const locatedClientWebhookMessageSchema = z
  .object({
    seller_phone: z.string().optional(),
    sellerPhone: z.string().optional(),
    vendedor_telefone: z.string().optional(),
    vendedorTelefone: z.string().optional(),
    customer_name: z.string().optional(),
    customerName: z.string().optional(),
    cliente_nome: z.string().optional(),
    clienteNome: z.string().optional(),
    city: z.string().optional(),
    cidade: z.string().optional(),
    state: z.string().optional(),
    estado: z.string().optional(),
    address: z.string().optional(),
    endereco: z.string().optional(),
    map_url: z.string().nullable().optional(),
    mapUrl: z.string().nullable().optional(),
    identified_at: z.string().optional(),
    identifiedAt: z.string().optional(),
    timestamp_iso: z.string().optional(),
    timestampIso: z.string().optional(),
    company_id: z.string().optional(),
    companyId: z.string().optional(),
    user_id: z.string().optional(),
    userId: z.string().optional(),
    source: z.string().optional(),
  })
  .superRefine((value, context) => {
    const sellerPhone =
      value.seller_phone ??
      value.sellerPhone ??
      value.vendedor_telefone ??
      value.vendedorTelefone;
    const customerName =
      value.customer_name ?? value.customerName ?? value.cliente_nome ?? value.clienteNome;
    const city = value.city ?? value.cidade;
    const state = value.state ?? value.estado;
    const address = value.address ?? value.endereco;

    if (!sellerPhone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone do vendedor e obrigatorio',
      });
    }

    if (!customerName) {
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
