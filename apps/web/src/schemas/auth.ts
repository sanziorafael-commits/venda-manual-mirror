import { z } from "zod";

// -----------------------------------------------------------------------------
// Form schemas
// -----------------------------------------------------------------------------

export const loginFormSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
  password: z.string().min(1, { message: "Senha obrigatória" }),
});

export const forgotPasswordFormSchema = z.object({
  email: z.string().email({ message: "E-mail inválido" }),
});

export const resetPasswordFormSchema = z
  .object({
    token: z.string().min(1, { message: "Token obrigatório" }),
    newPassword: z
      .string()
      .min(6, { message: "A nova senha deve ter pelo menos 6 caracteres" }),
    confirmPassword: z.string().min(1, { message: "Confirme sua nova senha" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const activateAccountFormSchema = z
  .object({
    token: z.string().min(1, { message: "Token obrigatório" }),
    password: z
      .string()
      .min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
    confirmPassword: z.string().min(1, { message: "Confirme sua senha" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const profileFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
    email: z.string().trim().email({ message: "E-mail inválido" }),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const password = data.newPassword.trim();
    const confirmation = data.confirmPassword.trim();

    if (!password && !confirmation) return;

    if (password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "A nova senha deve ter pelo menos 6 caracteres",
      });
    }

    if (password !== confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas não coincidem",
      });
    }
  });

// Compat names
export const loginSchema = loginFormSchema;
export const forgotSchema = forgotPasswordFormSchema;
export const resetPasswordSchema = resetPasswordFormSchema;
export const activateAccountSchema = activateAccountFormSchema;
export const profileSchema = profileFormSchema;

// -----------------------------------------------------------------------------
// Auth API + Session schemas
// -----------------------------------------------------------------------------

export const dashboardUserRoleSchema = z.enum([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
]);

export const authSessionUserSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().nullable(),
  role: dashboardUserRoleSchema,
  fullName: z.string().min(1),
  email: z.string().email().nullable(),
});

export const passwordStatusSchema = z.enum([
  "NOT_APPLICABLE",
  "PENDING",
  "SET",
]);

export const meUserSchema = authSessionUserSchema.extend({
  passwordStatus: passwordStatusSchema,
});

export const authTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.string().min(1),
});

export const authSessionSchema = z.object({
  user: authSessionUserSchema,
  tokens: authTokenSchema,
});

export const authOkSchema = z.object({
  ok: z.boolean(),
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z.unknown().optional(),
  });

export const loginResponseSchema = authSessionSchema;
export const loginApiResponseSchema = apiSuccessSchema(loginResponseSchema);
export const meApiResponseSchema = apiSuccessSchema(meUserSchema);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type ForgotPasswordFormInput = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;
export type ActivateAccountFormInput = z.infer<typeof activateAccountFormSchema>;
export type ProfileFormInput = z.infer<typeof profileFormSchema>;

export type LoginSchema = LoginFormInput;
export type ForgotSchema = ForgotPasswordFormInput;
export type ResetPasswordSchema = ResetPasswordFormInput;
export type ActivateAccountSchema = ActivateAccountFormInput;
export type ProfileSchema = ProfileFormInput;

export type AuthUser = z.infer<typeof authSessionUserSchema>;
export type AuthToken = z.infer<typeof authTokenSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type LoginApiResponse = z.infer<typeof loginApiResponseSchema>;
export type PasswordStatus = z.infer<typeof passwordStatusSchema>;
export type MeUser = z.infer<typeof meUserSchema>;
export type MeApiResponse = z.infer<typeof meApiResponseSchema>;
