"use client";

import { usePathname } from "next/navigation";

import { getPageTitleByPath } from "@/config/nav";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { CompanyContextSelect } from "./company-context-select";

export function SiteHeader() {
  const pathname = usePathname();
  const title = getPageTitleByPath(pathname);

  return (
    <header className="flex h-16 border-b border-border shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-16">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 ">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 hidden data-[orientation=vertical]:h-4 sm:block"
        />
        <h1 className="hidden text-base font-medium sm:block">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <CompanyContextSelect />
        </div>
      </div>
    </header>
  );
}

