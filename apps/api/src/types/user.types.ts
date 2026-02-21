import type { UserRole } from '@prisma/client';

export type UserListInput = {
  q?: string;
  company_id?: string;
  role?: UserRole;
  manager_id?: string;
  supervisor_id?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
};

export type CreateUserInput = {
  company_id?: string;
  role: UserRole;
  full_name: string;
  cpf: string;
  email?: string;
  phone: string;
  password?: string;
  manager_id?: string | null;
  supervisor_id?: string | null;
};

export type CreateUserByCompanyInput = Omit<CreateUserInput, 'company_id'>;

export type UpdateUserInput = {
  company_id?: string;
  role?: UserRole;
  full_name?: string;
  cpf?: string;
  email?: string | null;
  phone?: string;
  password?: string;
  is_active?: boolean;
  manager_id?: string | null;
  supervisor_id?: string | null;
};

export type ReassignSupervisorInput = {
  from_supervisor_id: string;
  to_supervisor_id: string;
};

export type ReassignManagerTeamInput = {
  from_manager_id: string;
  to_manager_id: string;
};

export type PublicUserViewInput = {
  id: string;
  company_id: string | null;
  manager_id?: string | null;
  supervisor_id?: string | null;
  role: UserRole;
  full_name: string;
  cpf: string;
  email: string | null;
  phone: string;
  passwordHash?: string | null;
  is_active: boolean;
  deleted_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  company?: { id: string; name: string } | null;
  manager?: { id: string; full_name: string } | null;
  supervisor?: { id: string; full_name: string } | null;
};


