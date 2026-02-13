export type DashboardRole = "ADMIN" | "GERENTE_COMERCIAL" | "SUPERVISOR";

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
    roles: ["ADMIN", "GERENTE_COMERCIAL", "SUPERVISOR"],
    showInNav: true,
  },
  {
    path: "/dashboard/companies",
    title: "Empresas",
    roles: ["ADMIN"],
    showInNav: true,
  },
  {
    path: "/dashboard/users",
    title: "Usuários",
    roles: ["ADMIN", "GERENTE_COMERCIAL", "SUPERVISOR"],
    showInNav: true,
  },
  {
    path: "/dashboard/conversations",
    title: "Histórico de Conversas",
    roles: ["ADMIN", "GERENTE_COMERCIAL", "SUPERVISOR"],
    showInNav: true,
  },
  {
    path: "/dashboard/located-clients",
    title: "Clientes Localizados",
    roles: ["GERENTE_COMERCIAL", "SUPERVISOR"],
    showInNav: true,
  },
  {
    path: "/dashboard/products",
    title: "Cadastro de Produtos",
    roles: ["GERENTE_COMERCIAL", "SUPERVISOR"],
    showInNav: true,
  },
  {
    path: "/dashboard/profile",
    title: "Perfil",
    roles: ["ADMIN", "GERENTE_COMERCIAL", "SUPERVISOR"],
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
