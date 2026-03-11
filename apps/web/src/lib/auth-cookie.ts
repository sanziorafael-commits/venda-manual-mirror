import { cookies } from "next/headers";

import { authSessionUserSchema, type AuthUser } from "@/schemas/auth";

export const AUTH_USER_COOKIE_KEY = "handsell.user_v2";

export async function getAuthUserFromServerCookies() {
  const cookieStore = await cookies();
  return parseAuthUserCookie(cookieStore.get(AUTH_USER_COOKIE_KEY)?.value);
}

export function parseAuthUserCookie(rawUserCookie?: string | null): AuthUser | null {
  if (!rawUserCookie) return null;

  const candidates = [rawUserCookie];
  try {
    candidates.push(decodeURIComponent(rawUserCookie));
  } catch {
    // noop: keep raw value fallback
  }

  try {
    candidates.push(decodeURIComponent(candidates[candidates.length - 1]!));
  } catch {
    // noop: keep previous fallback
  }

  for (const value of candidates) {
    try {
      const parsed = authSessionUserSchema.safeParse(JSON.parse(value));
      if (parsed.success) {
        return parsed.data;
      }
    } catch {
      // noop: try next candidate
    }
  }

  return null;
}

