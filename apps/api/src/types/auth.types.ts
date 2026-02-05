import type { UserRole } from '@prisma/client';

export type AuthActor = {
  userId: string;
  role: UserRole;
  companyId: string | null;
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
  userId: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type PublicUser = {
  id: string;
  companyId: string | null;
  role: UserRole;
  fullName: string;
  email: string | null;
  passwordStatus: 'NOT_APPLICABLE' | 'PENDING' | 'SET';
};

export type BootstrapAdminInput = {
  fullName: string;
  cpf: string;
  email: string;
  phone: string;
  password: string;
};

export type UpdateMeInput = {
  fullName?: string;
  email?: string;
  newPassword?: string;
};
