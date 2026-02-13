"use client";

import Link from "next/link";
import Image from "next/image";

import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link
          href="/dashboard"
          className="group flex w-full items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg">
            <span className="text-xs font-semibold">
              <Image
                src="/icone-handsell.svg"
                alt="Handsell"
                width={32}
                height={32}
                quality={100}
                loading="lazy"
              />
            </span>
          </div>

          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsed=true]:hidden">
            <span className="text-xs font-semibold ml-1">
              <Image
                src="/texto-handsell.svg"
                alt="Handsell"
                width={114}
                height={22}
                quality={100}
                loading="lazy"
              />
            </span>
          </div>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
