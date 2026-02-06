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
    token: z.string().min(1),
    newPassword: z
      .string()
      .min(6, { message: "A nova senha deve ter pelo menos 6 caracteres" }),
    confirmPassword: z.string().min(1, { message: "Confirme sua nova senha" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

// Compat names
export const loginSchema = loginFormSchema;
export const forgotSchema = forgotPasswordFormSchema;
export const resetPasswordSchema = resetPasswordFormSchema;

// -----------------------------------------------------------------------------
// Auth API + Session schemas
// -----------------------------------------------------------------------------

export const dashboardUserRoleSchema = z.enum([
  "ADMIN",
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

export const authTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.string().min(1),
});

export const authSessionSchema = z.object({
  user: authSessionUserSchema,
  tokens: authTokenSchema,
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z.unknown().optional(),
  });

export const loginResponseSchema = authSessionSchema;
export const loginApiResponseSchema = apiSuccessSchema(loginResponseSchema);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type ForgotPasswordFormInput = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;

export type LoginSchema = LoginFormInput;
export type ForgotSchema = ForgotPasswordFormInput;
export type ResetPasswordSchema = ResetPasswordFormInput;

export type AuthUser = z.infer<typeof authSessionUserSchema>;
export type AuthToken = z.infer<typeof authTokenSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type LoginApiResponse = z.infer<typeof loginApiResponseSchema>;
