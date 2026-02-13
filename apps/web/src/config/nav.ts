import {
  Building2,
  LayoutDashboard,
  MapPinned,
  MessageSquareMore,
  PackageSearch,
  User,
  type LucideIcon,
} from "lucide-react";

import {
  getDashboardNavRoutesByRole,
  getDashboardTitleByPath,
  type DashboardRole,
} from "@/config/dashboard-access";
import type { NavItem } from "@/types/nav";

const ICON_BY_PATH: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/companies": Building2,
  "/dashboard/users": User,
  "/dashboard/conversations": MessageSquareMore,
  "/dashboard/located-clients": MapPinned,
  "/dashboard/products": PackageSearch,
};

export function getMainNavByRole(role: DashboardRole): NavItem[] {
  return getDashboardNavRoutesByRole(role).map((route) => ({
    title: route.title,
    url: route.path,
    icon: ICON_BY_PATH[route.path],
  }));
}

export function getPageTitleByPath(pathname: string) {
  return getDashboardTitleByPath(pathname);
}
