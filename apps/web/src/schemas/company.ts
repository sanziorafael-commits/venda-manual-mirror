import { z } from "zod";

export const companyListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cnpj: z.string().min(1),
  logo_url: z.string().nullable().optional(),
  users_count: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const companyListMetaSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().positive(),
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
  logo_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createdCompanyApiResponseSchema = z.object({
  data: createdCompanySchema,
});

export const companyDetailsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cnpj: z.string().min(1),
  logo_url: z.string().nullable().optional(),
  logo_signed_url: z.string().url().nullable().optional(),
  users_count: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const companyDetailsApiResponseSchema = z.object({
  data: companyDetailsSchema,
});

export const companyUserRoleSchema = z.enum([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "VENDEDOR",
]);

export const companyUserPasswordStatusSchema = z.enum([
  "NOT_APPLICABLE",
  "PENDING",
  "SET",
]);

export const companyUserItemSchema = z.object({
  id: z.string().min(1),
  company_id: z.string().nullable(),
  manager_id: z.string().nullable().optional(),
  role: companyUserRoleSchema,
  full_name: z.string().min(1),
  cpf: z.string().min(1),
  email: z.string().nullable(),
  phone: z.string().min(1),
  is_active: z.boolean(),
  deleted_at: z.string().nullable().optional(),
  password_status: companyUserPasswordStatusSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const companyUsersApiResponseSchema = z.object({
  data: z.array(companyUserItemSchema),
  meta: companyListMetaSchema,
});

export const uploadSignedUrlDataSchema = z.object({
  target: z.enum(["COMPANY_LOGO", "PRODUCT_IMAGE", "PRODUCT_VIDEO"]),
  object_key: z.string().min(1),
  bucket: z.string().min(1),
  storage_url: z.string().min(1),
  public_url: z.string().url(),
  upload_url: z.string().url(),
  upload_method: z.literal("PUT"),
  upload_headers: z.object({
    "Content-Type": z.string().min(1),
  }),
  content_type: z.string().min(1),
  content_length: z.number().int().positive(),
  max_size_bytes: z.number().int().positive(),
  expires_at: z.string().datetime(),
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

