import { z } from "zod";

export const companyListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cnpj: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  usersCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const companyListMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
});

export const companiesApiResponseSchema = z.object({
  data: z.array(companyListItemSchema),
  meta: companyListMetaSchema,
});

export type CompanyListItem = z.infer<typeof companyListItemSchema>;
export type CompanyListMeta = z.infer<typeof companyListMetaSchema>;
export type CompaniesApiResponse = z.infer<typeof companiesApiResponseSchema>;
