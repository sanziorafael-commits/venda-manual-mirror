import { UserRole } from '@prisma/client';

export const DASHBOARD_LOGIN_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
  UserRole.TECNICO_GASTRONOMICO,
] as const satisfies readonly UserRole[];

export const DASHBOARD_OVERVIEW_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const USERS_MODULE_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const COMPANY_MODULE_ROLES = [
  UserRole.ADMIN,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const COMPANY_CREATE_DELETE_ROLES = [
  UserRole.ADMIN,
] as const satisfies readonly UserRole[];

export const CONVERSATION_READ_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const CONVERSATION_DELETE_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const LOCATED_CLIENT_READ_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const LOCATED_CLIENT_MUTATION_ROLES = [
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const PRODUCT_READ_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
  UserRole.TECNICO_GASTRONOMICO,
] as const satisfies readonly UserRole[];

export const PRODUCT_MUTATION_ROLES = [
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
  UserRole.TECNICO_GASTRONOMICO,
] as const satisfies readonly UserRole[];

export const PRODUCT_UPLOAD_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
  UserRole.TECNICO_GASTRONOMICO,
] as const satisfies readonly UserRole[];

export const COMPANY_LOGO_UPLOAD_ROLES = [
  UserRole.ADMIN,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const MASS_REASSIGN_SUPERVISOR_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const MASS_REASSIGN_MANAGER_TEAM_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const DOCS_ACCESS_ROLES = [
  UserRole.ADMIN,
  UserRole.DIRETOR,
  UserRole.GERENTE_COMERCIAL,
  UserRole.SUPERVISOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const COMPANY_WIDE_SCOPE_ROLES = [
  UserRole.DIRETOR,
  UserRole.RESPONSAVEL_TI,
] as const satisfies readonly UserRole[];

export const HIERARCHY_MANAGER_ROLES = [
  UserRole.GERENTE_COMERCIAL,
] as const satisfies readonly UserRole[];

export const HIERARCHY_SUPERVISOR_ROLES = [
  UserRole.SUPERVISOR,
] as const satisfies readonly UserRole[];

export const HIERARCHY_MANAGER_LINK_ROLES = [
  UserRole.SUPERVISOR,
] as const satisfies readonly UserRole[];

export const HIERARCHY_SUPERVISOR_LINK_ROLES = [
  UserRole.VENDEDOR,
] as const satisfies readonly UserRole[];

function hasRole(role: UserRole, roles: readonly UserRole[]) {
  return roles.includes(role);
}

export function isRoleWithDashboardAccess(role: UserRole) {
  return hasRole(role, DASHBOARD_LOGIN_ROLES);
}

export function canAccessDashboardOverview(role: UserRole) {
  return hasRole(role, DASHBOARD_OVERVIEW_ROLES);
}

export function canAccessUsersModule(role: UserRole) {
  return hasRole(role, USERS_MODULE_ROLES);
}

export function canAccessCompaniesModule(role: UserRole) {
  return hasRole(role, COMPANY_MODULE_ROLES);
}

export function canCreateOrDeleteCompanies(role: UserRole) {
  return hasRole(role, COMPANY_CREATE_DELETE_ROLES);
}

export function canReadConversations(role: UserRole) {
  return hasRole(role, CONVERSATION_READ_ROLES);
}

export function canDeleteConversations(role: UserRole) {
  return hasRole(role, CONVERSATION_DELETE_ROLES);
}

export function canReadLocatedClients(role: UserRole) {
  return hasRole(role, LOCATED_CLIENT_READ_ROLES);
}

export function canMutateLocatedClients(role: UserRole) {
  return hasRole(role, LOCATED_CLIENT_MUTATION_ROLES);
}

export function canReadProducts(role: UserRole) {
  return hasRole(role, PRODUCT_READ_ROLES);
}

export function canMutateProducts(role: UserRole) {
  return hasRole(role, PRODUCT_MUTATION_ROLES);
}

export function canUploadProductMedia(role: UserRole) {
  return hasRole(role, PRODUCT_UPLOAD_ROLES);
}

export function canUploadCompanyLogo(role: UserRole) {
  return hasRole(role, COMPANY_LOGO_UPLOAD_ROLES);
}

export function canReassignSupervisorTeam(role: UserRole) {
  return hasRole(role, MASS_REASSIGN_SUPERVISOR_ROLES);
}

export function canReassignManagerTeam(role: UserRole) {
  return hasRole(role, MASS_REASSIGN_MANAGER_TEAM_ROLES);
}

export function canAccessDocs(role: UserRole) {
  return hasRole(role, DOCS_ACCESS_ROLES);
}

export function hasCompanyWideScope(role: UserRole) {
  return hasRole(role, COMPANY_WIDE_SCOPE_ROLES);
}

export function isHierarchyManagerRole(role: UserRole) {
  return hasRole(role, HIERARCHY_MANAGER_ROLES);
}

export function isHierarchySupervisorRole(role: UserRole) {
  return hasRole(role, HIERARCHY_SUPERVISOR_ROLES);
}

export function requiresManagerHierarchyLink(role: UserRole) {
  return hasRole(role, HIERARCHY_MANAGER_LINK_ROLES);
}

export function requiresSupervisorHierarchyLink(role: UserRole) {
  return hasRole(role, HIERARCHY_SUPERVISOR_LINK_ROLES);
}
