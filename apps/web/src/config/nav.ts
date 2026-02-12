import {
  Building2,
  LayoutDashboard,
  MapPinned,
  MessageSquareMore,
  PackageSearch,
  User,
  type LucideIcon,
} from "lucide-react";

import type { AuthUser } from "@/schemas/auth";
import type { NavItem } from "@/types/nav";

type NavRouteConfig = {
  title: string;
  url: string;
  icon?: LucideIcon;
};

const DASHBOARD_ROUTES: NavRouteConfig[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Empresas",
    url: "/dashboard/companies",
    icon: Building2,
  },
  {
    title: "Usuários",
    url: "/dashboard/users",
    icon: User,
  },
  {
    title: "Histórico de Conversas",
    url: "/dashboard/conversations",
    icon: MessageSquareMore,
  },
  {
    title: "Clientes Localizados",
    url: "/dashboard/located-clients",
    icon: MapPinned,
  },
  {
    title: "Cadastro de Produtos",
    url: "/dashboard/products",
    icon: PackageSearch,
  },
];

const ROUTE_LOOKUP = new Map(
  DASHBOARD_ROUTES.map((route) => [route.url, route.title]),
);

const NAV_BY_ROLE: Record<AuthUser["role"], string[]> = {
  ADMIN: [
    "/dashboard",
    "/dashboard/companies",
    "/dashboard/users",
    "/dashboard/conversations",
  ],
  GERENTE_COMERCIAL: [
    "/dashboard",
    "/dashboard/conversations",
    "/dashboard/located-clients",
    "/dashboard/products",
    "/dashboard/users",
  ],
  SUPERVISOR: [
    "/dashboard",
    "/dashboard/conversations",
    "/dashboard/located-clients",
    "/dashboard/products",
    "/dashboard/users",
  ],
};

export function getMainNavByRole(role: AuthUser["role"]): NavItem[] {
  const allowedRoutes = new Set(NAV_BY_ROLE[role]);

  return DASHBOARD_ROUTES.filter((route) => allowedRoutes.has(route.url)).map(
    (route) => ({
      title: route.title,
      url: route.url,
      icon: route.icon,
    }),
  );
}

export function getPageTitleByPath(pathname: string) {
  const exactMatch = ROUTE_LOOKUP.get(pathname);
  if (exactMatch) {
    return exactMatch;
  }

  const matchedRoute = DASHBOARD_ROUTES
    .filter((route) => pathname === route.url || pathname.startsWith(`${route.url}/`))
    .sort((routeA, routeB) => routeB.url.length - routeA.url.length)[0];

  return matchedRoute?.title ?? "Dashboard";
}
