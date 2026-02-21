import type { UserRole } from '@prisma/client';

export type AuthActor = {
  user_id: string;
  role: UserRole;
  company_id: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
};

export type ActivateAccountInput = {
  token: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
};

export type SessionInput = {
  userAgent?: string;
  ipAddress?: string;
};

export type ResendActivationInput = {
  user_id: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: string;
};

export type PublicUser = {
  id: string;
  company_id: string | null;
  role: UserRole;
  full_name: string;
  email: string | null;
  password_status: 'NOT_APPLICABLE' | 'PENDING' | 'SET';
};

export type BootstrapAdminInput = {
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  password: string;
};

export type UpdateMeInput = {
  full_name?: string;
  email?: string;
  new_password?: string;
};


