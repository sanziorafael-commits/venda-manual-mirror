import { cookies } from "next/headers";

import { authSessionUserSchema, type AuthUser } from "@/schemas/auth";

export const AUTH_USER_COOKIE_KEY = "handsell.user";

export async function getAuthUserFromServerCookies() {
  const cookieStore = await cookies();
  return parseAuthUserCookie(cookieStore.get(AUTH_USER_COOKIE_KEY)?.value);
}

export function parseAuthUserCookie(rawUserCookie?: string | null): AuthUser | null {
  if (!rawUserCookie) return null;

  try {
    const decoded = decodeURIComponent(rawUserCookie);
    const parsed = authSessionUserSchema.safeParse(JSON.parse(decoded));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

