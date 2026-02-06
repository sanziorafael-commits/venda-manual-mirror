export type UserRole =
  | "ADMIN"
  | "GERENTE_COMERCIAL"
  | "SUPERVISOR"
  | "VENDEDOR";

export type User = {
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
