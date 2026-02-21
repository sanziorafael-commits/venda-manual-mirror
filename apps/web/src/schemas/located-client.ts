import { z } from "zod";

export const locatedClientStatusSchema = z.enum([
  "PENDENTE_VISITA",
  "VISITADO",
]);

export const locatedClientListItemSchema = z.object({
  id: z.string().min(1),
  company_id: z.string().nullable(),
  company_name: z.string().nullable(),
  identified_by_user_id: z.string().nullable(),
  identified_by_user_name: z.string().nullable(),
  source_seller_phone: z.string().min(1),
  customer_name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  address: z.string().min(1),
  map_url: z.string().nullable(),
  identified_at: z.string(),
  status: locatedClientStatusSchema,
  visited_at: z.string().nullable(),
  visited_by_user_id: z.string().nullable(),
  visited_by_user_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const locatedClientListMetaSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().positive(),
});

export const locatedClientsApiResponseSchema = z.object({
  data: z.array(locatedClientListItemSchema),
  meta: locatedClientListMetaSchema,
});

export const locatedClientDetailApiResponseSchema = z.object({
  data: locatedClientListItemSchema,
});

export type LocatedClientStatus = z.infer<typeof locatedClientStatusSchema>;
export type LocatedClientListItem = z.infer<typeof locatedClientListItemSchema>;
export type LocatedClientListMeta = z.infer<typeof locatedClientListMetaSchema>;

