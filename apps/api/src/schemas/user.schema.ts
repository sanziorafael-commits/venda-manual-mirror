import { UserRole } from '@prisma/client';
import { z } from 'zod';

const phoneSchema = z.string().min(1).refine((value) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}, 'Celular deve conter entre 10 e 13 digitos');

const booleanQueryParamSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

export const userQuerySchema = z.object({
  q: z.string().optional(),
  company_id: z.string().uuid().optional(),
  role: z.nativeEnum(UserRole).optional(),
  manager_id: z.string().uuid().optional(),
  supervisor_id: z.string().uuid().optional(),
  is_active: booleanQueryParamSchema,
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(10),
});

export const userParamSchema = z.object({
  user_id: z.string().uuid(),
});

export const createUserSchema = z.object({
  company_id: z.string().uuid().optional(),
  role: z.nativeEnum(UserRole),
  full_name: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email().optional(),
  phone: phoneSchema,
  password: z.string().min(6).optional(),
  manager_id: z.string().uuid().nullable().optional(),
  supervisor_id: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z
  .object({
    company_id: z.string().uuid().optional(),
    role: z.nativeEnum(UserRole).optional(),
    full_name: z.string().min(2).optional(),
    cpf: z.string().min(11).optional(),
    email: z.string().email().nullable().optional(),
    phone: phoneSchema.optional(),
    password: z.string().min(6).optional(),
    is_active: z.boolean().optional(),
    manager_id: z.string().uuid().nullable().optional(),
    supervisor_id: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const reassignSupervisorSchema = z.object({
  from_supervisor_id: z.string().uuid(),
  to_supervisor_id: z.string().uuid(),
});

export const reassignManagerTeamSchema = z.object({
  from_manager_id: z.string().uuid(),
  to_manager_id: z.string().uuid(),
});


