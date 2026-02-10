import { UserRole } from '@prisma/client';
import { z } from 'zod';

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
  companyId: z.string().cuid().optional(),
  role: z.nativeEnum(UserRole).optional(),
  managerId: z.string().cuid().optional(),
  supervisorId: z.string().cuid().optional(),
  isActive: booleanQueryParamSchema,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export const userParamSchema = z.object({
  userId: z.string().cuid(),
});

export const createUserSchema = z.object({
  companyId: z.string().cuid().optional(),
  role: z.nativeEnum(UserRole),
  fullName: z.string().min(2),
  cpf: z.string().min(11),
  email: z.string().email().optional(),
  phone: z.string().min(8),
  password: z.string().min(6).optional(),
  managerId: z.string().cuid().nullable().optional(),
  supervisorId: z.string().cuid().nullable().optional(),
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
    managerId: z.string().cuid().nullable().optional(),
    supervisorId: z.string().cuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const reassignSupervisorSchema = z.object({
  fromSupervisorId: z.string().cuid(),
  toSupervisorId: z.string().cuid(),
});

export const reassignManagerTeamSchema = z.object({
  fromManagerId: z.string().cuid(),
  toManagerId: z.string().cuid(),
});
