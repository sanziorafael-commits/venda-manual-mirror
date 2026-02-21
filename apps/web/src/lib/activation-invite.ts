import type { AuthUser } from "@/schemas/auth";
import type { UserRole } from "@/schemas/user";

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

const INVITABLE_ROLES = new Set<UserRole>([
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
]);

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

  if (!INVITABLE_ROLES.has(target.role)) {
    return false;
  }

  if (actor.role === "ADMIN") {
    return true;
  }

  if (!actor.company_id || actor.company_id !== target.company_id) {
    return false;
  }

  if (actor.role === "DIRETOR") {
    return target.role === "GERENTE_COMERCIAL" || target.role === "SUPERVISOR";
  }

  if (actor.role === "GERENTE_COMERCIAL") {
    return target.role === "SUPERVISOR" && target.manager_id === actor.id;
  }

  return false;
}

