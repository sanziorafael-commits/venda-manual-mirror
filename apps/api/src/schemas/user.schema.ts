import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const userQuerySchema = z.object({
  q: z.string().optional(),
  companyId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export const createUserSchema = z.object({
  companyId: z.string().cuid().optional(),
  role: z.nativeEnum(UserRole),
  fullName: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email().optional(),
  phone: z.string().min(8),
  password: z.string().min(6).optional(),
});

export const updateUserSchema = z
  .object({
    companyId: z.string().cuid().optional(),
    role: z.nativeEnum(UserRole).optional(),
    fullName: z.string().min(2).optional(),
    cpf: z.string().min(11).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(8).optional(),
    password: z.string().min(6).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });
