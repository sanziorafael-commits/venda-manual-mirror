import { z } from "zod";

export const locatedClientStatusSchema = z.enum([
  "PENDENTE_VISITA",
  "VISITADO",
]);

export const locatedClientListItemSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().nullable(),
  companyName: z.string().nullable(),
  identifiedByUserId: z.string().nullable(),
  identifiedByUserName: z.string().nullable(),
  sourceSellerPhone: z.string().min(1),
  customerName: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  address: z.string().min(1),
  mapUrl: z.string().nullable(),
  identifiedAt: z.string(),
  status: locatedClientStatusSchema,
  visitedAt: z.string().nullable(),
  visitedByUserId: z.string().nullable(),
  visitedByUserName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const locatedClientListMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
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
