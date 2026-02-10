"use client";

import {
  Building2,
  LayoutDashboard,
  MapPinned,
  MessageSquareMore,
  PackageSearch,
  User,
} from "lucide-react";

import { NavMain } from "@/components/dashboard/app-sidebar/nav-main";
import { NavUser } from "@/components/dashboard/app-sidebar/nav-user";
import { TeamSwitcher } from "@/components/dashboard/app-sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/schemas/auth";
import type { NavItem } from "@/types/nav";
import type { ComponentProps } from "react";

type AppSidebarClientProps = ComponentProps<typeof Sidebar> & {
  user: AuthUser;
};

export function AppSidebarClient({ user, ...props }: AppSidebarClientProps) {
  const navItemsByRole: Record<AuthUser["role"], NavItem[]> = {
    ADMIN: [
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
    ],
    GERENTE_COMERCIAL: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
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
      {
        title: "Usuários",
        url: "/dashboard/users",
        icon: User,
      },
    ],
    SUPERVISOR: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
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
      {
        title: "Usuários",
        url: "/dashboard/users",
        icon: User,
      },
    ],
  };

  const navItems = navItemsByRole[user.role];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.fullName,
            email: user.email ?? "",
            role: user.role,
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
