import type { AuthUser } from "@/schemas/auth";
import type { UserRole } from "@/schemas/user";

type ActivationInvitePasswordStatus = "NOT_APPLICABLE" | "PENDING" | "SET";

type ActivationInviteTarget = {
  role: UserRole;
  companyId: string | null;
  managerId?: string | null;
  email: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  passwordStatus?: ActivationInvitePasswordStatus;
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

  if (target.deletedAt) {
    return false;
  }

  if (!target.isActive) {
    return false;
  }

  if (target.passwordStatus !== "PENDING") {
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

  if (!actor.companyId || actor.companyId !== target.companyId) {
    return false;
  }

  if (actor.role === "DIRETOR") {
    return target.role === "GERENTE_COMERCIAL" || target.role === "SUPERVISOR";
  }

  if (actor.role === "GERENTE_COMERCIAL") {
    return target.role === "SUPERVISOR" && target.managerId === actor.id;
  }

  return false;
}
