import { z } from "zod";

export const userRoleSchema = z.enum([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "VENDEDOR",
]);

export const userCompanySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const userListItemSchema = z.object({
  id: z.string().min(1),
  company_id: z.string().nullable(),
  company: userCompanySchema.nullable().optional(),
  manager_id: z.string().nullable().optional(),
  manager: z
    .object({
      id: z.string().min(1),
      full_name: z.string().min(1),
    })
    .nullable()
    .optional(),
  supervisor_id: z.string().nullable().optional(),
  supervisor: z
    .object({
      id: z.string().min(1),
      full_name: z.string().min(1),
    })
    .nullable()
    .optional(),
  role: userRoleSchema,
  full_name: z.string().min(1),
  cpf: z.string().min(1),
  email: z.string().nullable(),
  phone: z.string().min(1),
  is_active: z.boolean(),
  deleted_at: z.string().nullable().optional(),
  password_status: z.enum(["NOT_APPLICABLE", "PENDING", "SET"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export const userListMetaSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().positive(),
});

export const usersApiResponseSchema = z.object({
  data: z.array(userListItemSchema),
  meta: userListMetaSchema,
});

export const createUserFormSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, { message: "Nome completo deve ter pelo menos 2 caracteres." }),
    cpf: z
      .string()
      .trim()
      .min(1, { message: "CPF obrigatório." })
      .refine((value) => value.replace(/\D/g, "").length === 11, {
        message: "CPF deve conter 11 dígitos.",
      }),
    email: z.string().trim().optional(),
    phone: z
      .string()
      .trim()
      .min(1, { message: "Celular obrigatório." })
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 13;
      }, {
        message: "Celular deve conter entre 10 e 13 dígitos.",
      }),
    role: userRoleSchema,
    company_id: z.string().trim().optional(),
    password: z.string().optional(),
    manager_id: z.string().trim().optional(),
    supervisor_id: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.role !== "VENDEDOR") {
      if (!value.email?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "E-mail obrigatório para cargos com acesso ao painel.",
        });
      } else if (!z.string().email().safeParse(value.email.trim()).success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "E-mail inválido.",
        });
      }
    }

    if (value.role === "ADMIN") {
      const password = value.password?.trim() ?? "";
      if (password.length < 6) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Senha deve ter no mínimo 6 caracteres.",
        });
      }
    }
  });

export const createdUserApiResponseSchema = z.object({
  data: userListItemSchema,
});

export const userDetailsApiResponseSchema = z.object({
  data: userListItemSchema,
});

export const updateUserFormSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, { message: "Nome completo deve ter pelo menos 2 caracteres." }),
    cpf: z
      .string()
      .trim()
      .min(1, { message: "CPF obrigatório." })
      .refine((value) => value.replace(/\D/g, "").length === 11, {
        message: "CPF deve conter 11 dígitos.",
      }),
    email: z.string().trim().optional(),
    phone: z
      .string()
      .trim()
      .min(1, { message: "Celular obrigatório." })
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 13;
      }, {
        message: "Celular deve conter entre 10 e 13 dígitos.",
      }),
    role: userRoleSchema,
    company_id: z.string().trim().optional(),
    password: z.string().optional(),
    manager_id: z.string().trim().optional(),
    supervisor_id: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.role !== "VENDEDOR") {
      if (!value.email?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "E-mail obrigatório para cargos com acesso ao painel.",
        });
      } else if (!z.string().email().safeParse(value.email.trim()).success) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "E-mail inválido.",
        });
      }
    }

    if (value.password?.trim()) {
      if (value.password.trim().length < 6) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Senha deve ter no mínimo 6 caracteres.",
        });
      }
    }
  });

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserCompany = z.infer<typeof userCompanySchema>;
export type UserListItem = z.infer<typeof userListItemSchema>;
export type UserListMeta = z.infer<typeof userListMetaSchema>;
export type CreateUserFormInput = z.infer<typeof createUserFormSchema>;
export type UpdateUserFormInput = z.infer<typeof updateUserFormSchema>;

