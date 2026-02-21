import { z } from 'zod';

const phoneSchema = z.string().min(1).refine((value) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}, 'Celular deve conter entre 10 e 13 digitos');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(20),
});

export const activateAccountSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

export const resendActivationSchema = z.object({
  user_id: z.string().uuid(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

export const bootstrapAdminSchema = z.object({
  full_name: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email(),
  phone: phoneSchema,
  password: z.string().min(6),
});

export const updateMeSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  new_password: z.string().min(6).optional(),
});


