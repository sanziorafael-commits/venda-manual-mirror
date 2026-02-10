import type { AuthUser } from "@/schemas/auth";
import { getAuthUserFromServerCookies } from "@/lib/auth-cookie";

import { AppSidebarClient } from "./app-sidebar-client";

type AppSidebarServerProps = {
  initialUser?: AuthUser | null;
};

export async function AppSidebarServer({ initialUser }: AppSidebarServerProps) {
  const user = initialUser ?? (await getAuthUserFromServerCookies());
  if (!user) {
    return null;
  }

  return <AppSidebarClient user={user} />;
}
