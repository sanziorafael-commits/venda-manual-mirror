import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthUserFromServerCookies } from "@/lib/auth-cookie";
import { getDefaultDashboardPath } from "@/lib/role-capabilities";

const REFRESH_COOKIE_KEY = "handsell.refresh_token_v2";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(REFRESH_COOKIE_KEY)?.value);
  const authUser = hasSession ? await getAuthUserFromServerCookies() : null;

  redirect(hasSession && authUser ? getDefaultDashboardPath(authUser.role) : hasSession ? "/dashboard" : "/login");
}

