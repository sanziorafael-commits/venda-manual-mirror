import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const companyQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export const createCompanySchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().min(14),
  logoUrl: z.string().url().optional(),
});

export const updateCompanySchema = z
  .object({
    name: z.string().min(2).optional(),
    cnpj: z.string().min(14).optional(),
    logoUrl: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const createCompanyUserSchema = z.object({
  role: z.nativeEnum(UserRole),
  fullName: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email().optional(),
  phone: z.string().min(8),
  password: z.string().min(6).optional(),
});
