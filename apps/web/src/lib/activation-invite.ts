import type { AuthUser } from "@/schemas/auth";
import type { UserRole } from "@/schemas/user";
import { isInvitableRole } from "@/lib/role-capabilities";

type ActivationInvitePasswordStatus = "NOT_APPLICABLE" | "PENDING" | "SET";

type ActivationInviteTarget = {
  role: UserRole;
  company_id: string | null;
  manager_id?: string | null;
  email: string | null;
  is_active: boolean;
  deleted_at?: string | null;
  password_status?: ActivationInvitePasswordStatus;
};

export function canResendActivationInvite(
  actor: AuthUser | null,
  target: ActivationInviteTarget,
) {
  if (!actor) {
    return false;
  }

  if (target.deleted_at) {
    return false;
  }

  if (!target.is_active) {
    return false;
  }

  if (target.password_status !== "PENDING") {
    return false;
  }

  if (!target.email) {
    return false;
  }

  if (!isInvitableRole(target.role)) {
    return false;
  }

  if (actor.role === "ADMIN") {
    return true;
  }

  if (!actor.company_id || actor.company_id !== target.company_id) {
    return false;
  }

  return (
    actor.role === "DIRETOR" ||
    actor.role === "GERENTE_COMERCIAL" ||
    actor.role === "RESPONSAVEL_TI"
  );
}

