import type { UserRole } from '@prisma/client';

export type UserListInput = {
  q?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateUserInput = {
  companyId?: string;
  role: UserRole;
  fullName: string;
  cpf: string;
  email?: string;
  phone: string;
  password?: string;
};

export type CreateUserByCompanyInput = Omit<CreateUserInput, 'companyId'>;

export type UpdateUserInput = {
  companyId?: string;
  role?: UserRole;
  fullName?: string;
  cpf?: string;
  email?: string | null;
  phone?: string;
  password?: string;
  isActive?: boolean;
};

export type PublicUserViewInput = {
  id: string;
  companyId: string | null;
  role: UserRole;
  fullName: string;
  cpf: string;
  email: string | null;
  phone: string;
  passwordHash?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  company?: { id: string; name: string } | null;
};
