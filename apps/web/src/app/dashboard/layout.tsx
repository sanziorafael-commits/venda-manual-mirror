import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthStoreHydrator } from "@/components/auth/auth-store-hydrator";
import { getAuthUserFromServerCookies } from "@/lib/auth-cookie";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { AppSidebarServer } from "@/components/dashboard/app-sidebar/app-sidebar-server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authUser = await getAuthUserFromServerCookies();

  if (!authUser) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AuthStoreHydrator initialUser={authUser} />
      <AppSidebarServer initialUser={authUser} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-0 pt-0 sm:p-4 sm:pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

