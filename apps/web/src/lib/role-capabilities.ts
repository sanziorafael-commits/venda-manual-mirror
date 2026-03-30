import type { AuthUser } from "@/schemas/auth";
import type { UserRole } from "@/schemas/user";

export type PanelRole = AuthUser["role"];

export const ROLE_LABEL_BY_VALUE: Record<UserRole, string> = {
  ADMIN: "Admin",
  DIRETOR: "Diretor",
  GERENTE_COMERCIAL: "Gerente Comercial",
  SUPERVISOR: "Supervisor",
  VENDEDOR: "Vendedor",
  RESPONSAVEL_TI: "Responsável TI",
  TECNICO_GASTRONOMICO: "Técnico Gastronômico",
};

const DASHBOARD_OVERVIEW_ROLES = new Set<PanelRole>([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "RESPONSAVEL_TI",
]);

const USERS_MODULE_ROLES = new Set<PanelRole>([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "RESPONSAVEL_TI",
]);

const COMPANY_MODULE_ROLES = new Set<PanelRole>(["ADMIN", "RESPONSAVEL_TI"]);

const PRODUCT_READ_ROLES = new Set<PanelRole>([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "RESPONSAVEL_TI",
  "TECNICO_GASTRONOMICO",
]);

const PRODUCT_MUTATION_ROLES = new Set<PanelRole>([
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "RESPONSAVEL_TI",
  "TECNICO_GASTRONOMICO",
]);

const CONVERSATION_DELETE_ROLES = new Set<PanelRole>([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "RESPONSAVEL_TI",
]);

const LOCATED_CLIENT_MUTATION_ROLES = new Set<PanelRole>([
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "RESPONSAVEL_TI",
]);

const MASS_REASSIGN_MANAGER_ROLES = new Set<PanelRole>([
  "ADMIN",
  "DIRETOR",
  "RESPONSAVEL_TI",
]);

const MASS_REASSIGN_SUPERVISOR_ROLES = new Set<PanelRole>([
  "ADMIN",
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "RESPONSAVEL_TI",
]);

const DASHBOARD_SCOPE_SELECTOR_ROLES = new Set<PanelRole>([
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "RESPONSAVEL_TI",
]);

const INVITABLE_ROLES = new Set<UserRole>([
  "DIRETOR",
  "GERENTE_COMERCIAL",
  "SUPERVISOR",
  "RESPONSAVEL_TI",
  "TECNICO_GASTRONOMICO",
]);

const USER_CREATE_ROLE_MATRIX: Record<PanelRole, readonly UserRole[]> = {
  ADMIN: [
    "ADMIN",
    "DIRETOR",
    "GERENTE_COMERCIAL",
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  DIRETOR: [
    "GERENTE_COMERCIAL",
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  GERENTE_COMERCIAL: [
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  SUPERVISOR: ["VENDEDOR"],
  RESPONSAVEL_TI: [
    "GERENTE_COMERCIAL",
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  TECNICO_GASTRONOMICO: [],
};

const USER_MANAGE_ROLE_MATRIX: Record<PanelRole, readonly UserRole[]> = {
  ADMIN: [
    "ADMIN",
    "DIRETOR",
    "GERENTE_COMERCIAL",
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  DIRETOR: [
    "GERENTE_COMERCIAL",
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  GERENTE_COMERCIAL: [
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  SUPERVISOR: ["VENDEDOR"],
  RESPONSAVEL_TI: [
    "DIRETOR",
    "GERENTE_COMERCIAL",
    "SUPERVISOR",
    "VENDEDOR",
    "RESPONSAVEL_TI",
    "TECNICO_GASTRONOMICO",
  ],
  TECNICO_GASTRONOMICO: [],
};

export function canAccessDashboardOverview(role: PanelRole) {
  return DASHBOARD_OVERVIEW_ROLES.has(role);
}

export function canAccessUsersModule(role: PanelRole) {
  return USERS_MODULE_ROLES.has(role);
}

export function canAccessCompaniesModule(role: PanelRole) {
  return COMPANY_MODULE_ROLES.has(role);
}

export function canCreateCompanies(role: PanelRole) {
  return role === "ADMIN";
}

export function canDeleteCompanies(role: PanelRole) {
  return role === "ADMIN";
}

export function canReadProducts(role: PanelRole) {
  return PRODUCT_READ_ROLES.has(role);
}

export function canManageProducts(role: PanelRole) {
  return PRODUCT_MUTATION_ROLES.has(role);
}

export function canDeleteConversations(role: PanelRole) {
  return CONVERSATION_DELETE_ROLES.has(role);
}

export function canMutateLocatedClients(role: PanelRole) {
  return LOCATED_CLIENT_MUTATION_ROLES.has(role);
}

export function canReassignManagers(role: PanelRole) {
  return MASS_REASSIGN_MANAGER_ROLES.has(role);
}

export function canReassignSupervisors(role: PanelRole) {
  return MASS_REASSIGN_SUPERVISOR_ROLES.has(role);
}

export function canSelectDashboardScope(role: PanelRole) {
  return DASHBOARD_SCOPE_SELECTOR_ROLES.has(role);
}

export function isInvitableRole(role: UserRole) {
  return INVITABLE_ROLES.has(role);
}

export function getCreatableUserRoles(actorRole: PanelRole) {
  return [...USER_CREATE_ROLE_MATRIX[actorRole]];
}

export function getManageableUserRoles(actorRole: PanelRole) {
  return [...USER_MANAGE_ROLE_MATRIX[actorRole]];
}

export function canCreateUserRole(actorRole: PanelRole, targetRole: UserRole) {
  return USER_CREATE_ROLE_MATRIX[actorRole].includes(targetRole);
}

export function canManageUserRole(actorRole: PanelRole, targetRole: UserRole) {
  return USER_MANAGE_ROLE_MATRIX[actorRole].includes(targetRole);
}

export function getDefaultDashboardPath(role: PanelRole) {
  if (canAccessDashboardOverview(role)) {
    return "/dashboard";
  }

  if (canAccessCompaniesModule(role)) {
    return "/dashboard/companies";
  }

  if (canReadProducts(role)) {
    return "/dashboard/products";
  }

  return "/dashboard/profile";
}
