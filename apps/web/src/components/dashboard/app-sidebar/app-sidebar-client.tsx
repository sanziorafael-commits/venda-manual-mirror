"use client";

import { NavMain } from "@/components/dashboard/app-sidebar/nav-main";
import { NavUser } from "@/components/dashboard/app-sidebar/nav-user";
import { TeamSwitcher } from "@/components/dashboard/app-sidebar/team-switcher";
import { getMainNavByRole } from "@/config/nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/schemas/auth";
import type { ComponentProps } from "react";

type AppSidebarClientProps = ComponentProps<typeof Sidebar> & {
  user: AuthUser;
};

export function AppSidebarClient({ user, ...props }: AppSidebarClientProps) {
  const navItems = getMainNavByRole(user.role);

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
