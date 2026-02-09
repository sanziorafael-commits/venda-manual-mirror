import type { UserRole } from '@prisma/client';

export type UserListInput = {
  q?: string;
  companyId?: string;
  role?: UserRole;
  managerId?: string;
  supervisorId?: string;
  isActive?: boolean;
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
  managerId?: string | null;
  supervisorId?: string | null;
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
  managerId?: string | null;
  supervisorId?: string | null;
};

export type ReassignSupervisorInput = {
  fromSupervisorId: string;
  toSupervisorId: string;
};

export type ReassignManagerTeamInput = {
  fromManagerId: string;
  toManagerId: string;
};

export type PublicUserViewInput = {
  id: string;
  companyId: string | null;
  managerId?: string | null;
  supervisorId?: string | null;
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
  manager?: { id: string; fullName: string } | null;
  supervisor?: { id: string; fullName: string } | null;
};
