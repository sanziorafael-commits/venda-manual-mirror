import { UserRole } from '@prisma/client';
import { z } from 'zod';

const phoneSchema = z.string().min(1).refine((value) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}, 'Celular deve conter entre 10 e 13 digitos');

export const companyQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(10),
});

export const companyParamSchema = z.object({
  company_id: z.string().uuid(),
});

export const createCompanySchema = z.object({
  name: z.string().min(2),
  cnpj: z.string().min(14),
  logo_url: z.string().url().optional(),
});

export const updateCompanySchema = z
  .object({
    name: z.string().min(2).optional(),
    cnpj: z.string().min(14).optional(),
    logo_url: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const createCompanyUserSchema = z.object({
  role: z.nativeEnum(UserRole),
  full_name: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email().optional(),
  phone: phoneSchema,
  password: z.string().min(6).optional(),
  manager_id: z.string().uuid().nullable().optional(),
  supervisor_id: z.string().uuid().nullable().optional(),
});


