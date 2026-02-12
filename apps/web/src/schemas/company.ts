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

export const createCompanyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Nome da empresa deve ter pelo menos 2 caracteres." }),
  cnpj: z
    .string()
    .trim()
    .min(1, { message: "CNPJ obrigatório." })
    .refine((value) => value.replace(/\D/g, "").length === 14, {
      message: "CNPJ deve conter 14 dígitos.",
    }),
});

export const createdCompanySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cnpj: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createdCompanyApiResponseSchema = z.object({
  data: createdCompanySchema,
});

export const companyDetailsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cnpj: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  logoSignedUrl: z.string().url().nullable().optional(),
  usersCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const companyDetailsApiResponseSchema = z.object({
  data: companyDetailsSchema,
});

export const companyUserRoleSchema = z.enum([
  "ADMIN",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "VENDEDOR",
]);

export const companyUserItemSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().nullable(),
  role: companyUserRoleSchema,
  fullName: z.string().min(1),
  cpf: z.string().min(1),
  email: z.string().nullable(),
  phone: z.string().min(1),
  isActive: z.boolean(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const companyUsersApiResponseSchema = z.object({
  data: z.array(companyUserItemSchema),
  meta: companyListMetaSchema,
});

export const uploadSignedUrlDataSchema = z.object({
  target: z.enum(["COMPANY_LOGO", "PRODUCT_IMAGE", "PRODUCT_VIDEO"]),
  objectKey: z.string().min(1),
  bucket: z.string().min(1),
  storageUrl: z.string().min(1),
  publicUrl: z.string().url(),
  uploadUrl: z.string().url(),
  uploadMethod: z.literal("PUT"),
  uploadHeaders: z.object({
    "Content-Type": z.string().min(1),
  }),
  contentType: z.string().min(1),
  contentLength: z.number().int().positive(),
  maxSizeBytes: z.number().int().positive(),
  expiresAt: z.string().datetime(),
});

export const uploadSignedUrlApiResponseSchema = z.object({
  data: uploadSignedUrlDataSchema,
});

export type CompanyListItem = z.infer<typeof companyListItemSchema>;
export type CompanyListMeta = z.infer<typeof companyListMetaSchema>;
export type CompaniesApiResponse = z.infer<typeof companiesApiResponseSchema>;
export type CreateCompanyFormInput = z.infer<typeof createCompanyFormSchema>;
export type CreatedCompany = z.infer<typeof createdCompanySchema>;
export type CompanyDetails = z.infer<typeof companyDetailsSchema>;
export type CompanyUserItem = z.infer<typeof companyUserItemSchema>;
export type UploadSignedUrlData = z.infer<typeof uploadSignedUrlDataSchema>;
