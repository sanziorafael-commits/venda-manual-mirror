import type { PanelRole } from "@/lib/role-capabilities";

export type DashboardRole = PanelRole;

type DashboardRouteRule = {
  path: string;
  title: string;
  roles: DashboardRole[];
  showInNav: boolean;
};

const DASHBOARD_ROUTE_RULES: DashboardRouteRule[] = [
  {
    path: "/dashboard",
    title: "Dashboard",
    roles: [
      "ADMIN",
      "DIRETOR",
      "GERENTE_COMERCIAL",
      "SUPERVISOR",
      "RESPONSAVEL_TI",
    ],
    showInNav: true,
  },
  {
    path: "/dashboard/companies",
    title: "Empresas",
    roles: ["ADMIN", "RESPONSAVEL_TI"],
    showInNav: true,
  },
  {
    path: "/dashboard/companies/new",
    title: "Adicionar Empresa",
    roles: ["ADMIN"],
    showInNav: false,
  },
  {
    path: "/dashboard/users",
    title: "Usuários",
    roles: [
      "ADMIN",
      "DIRETOR",
      "GERENTE_COMERCIAL",
      "SUPERVISOR",
      "RESPONSAVEL_TI",
    ],
    showInNav: true,
  },
  {
    path: "/dashboard/users/mass-reassignment",
    title: "Alteração em Massa",
    roles: ["ADMIN", "DIRETOR", "GERENTE_COMERCIAL", "RESPONSAVEL_TI"],
    showInNav: true,
  },
  {
    path: "/dashboard/conversations",
    title: "Histórico de Conversas",
    roles: [
      "ADMIN",
      "DIRETOR",
      "GERENTE_COMERCIAL",
      "SUPERVISOR",
      "RESPONSAVEL_TI",
    ],
    showInNav: true,
  },
  {
    path: "/dashboard/located-clients",
    title: "Clientes Localizados",
    roles: [
      "ADMIN",
      "DIRETOR",
      "GERENTE_COMERCIAL",
      "SUPERVISOR",
      "RESPONSAVEL_TI",
    ],
    showInNav: true,
  },
  {
    path: "/dashboard/products",
    title: "Cadastro de Produtos",
    roles: [
      "ADMIN",
      "DIRETOR",
      "GERENTE_COMERCIAL",
      "SUPERVISOR",
      "RESPONSAVEL_TI",
      "TECNICO_GASTRONOMICO",
    ],
    showInNav: true,
  },
  {
    path: "/dashboard/profile",
    title: "Perfil",
    roles: [
      "ADMIN",
      "DIRETOR",
      "GERENTE_COMERCIAL",
      "SUPERVISOR",
      "RESPONSAVEL_TI",
      "TECNICO_GASTRONOMICO",
    ],
    showInNav: false,
  },
];

const DASHBOARD_ROUTE_RULES_BY_PATH_LENGTH = [...DASHBOARD_ROUTE_RULES].sort(
  (a, b) => b.path.length - a.path.length,
);

export function canAccessDashboardPath(pathname: string, role: DashboardRole) {
  const rule = findDashboardRouteRule(pathname);
  if (!rule) {
    return false;
  }

  return rule.roles.includes(role);
}

export function getDashboardTitleByPath(pathname: string) {
  return findDashboardRouteRule(pathname)?.title ?? "Dashboard";
}

export function getDashboardNavRoutesByRole(role: DashboardRole) {
  return DASHBOARD_ROUTE_RULES.filter(
    (route) => route.showInNav && route.roles.includes(role),
  );
}

function findDashboardRouteRule(pathname: string) {
  return DASHBOARD_ROUTE_RULES_BY_PATH_LENGTH.find(
    (route) => pathname === route.path || pathname.startsWith(`${route.path}/`),
  );
}
