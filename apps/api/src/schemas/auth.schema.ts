import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});

export const activateAccountSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

export const resendActivationSchema = z.object({
  userId: z.string().cuid(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6),
});

export const bootstrapAdminSchema = z.object({
  fullName: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(6),
});

export const updateMeSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(6).optional(),
});
