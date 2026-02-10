"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { ThemeToggleSlider } from "./theme-toggle-slider";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/companies": "Empresas",
  "/dashboard/users": "Usuarios",
  "/dashboard/conversations": "Historico de Conversas",
  "/dashboard/located-clients": "Clientes Localizados",
  "/dashboard/products": "Cadastro de Produtos",
  "/dashboard/profile": "Perfil",
};

export function SiteHeader() {
  const pathname = usePathname();
  const title = routeTitles[pathname] || "Dashboard";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggleSlider />
        </div>
      </div>
    </header>
  );
}
