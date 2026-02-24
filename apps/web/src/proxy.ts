import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  canAccessDashboardPath,
  type DashboardRole,
} from "@/config/dashboard-access";

const REFRESH_COOKIE_KEY = "handsell.refresh_token_v2";
const USER_COOKIE_KEY = "handsell.user_v2";

type SessionUser = {
  role: DashboardRole;
};

function isDashboardRoute(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function isLoginRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(REFRESH_COOKIE_KEY)?.value);
  const user = parseSessionUser(request.cookies.get(USER_COOKIE_KEY)?.value);

  if (isDashboardRoute(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isDashboardRoute(pathname)) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (!canAccessDashboardPath(pathname, user.role)) {
      const fallbackUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(fallbackUrl);
    }
  }

  if (isLoginRoute(pathname) && hasSession && user) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

function parseSessionUser(rawCookieValue?: string) {
  if (!rawCookieValue) return null;

  const candidates = [rawCookieValue];
  try {
    candidates.push(decodeURIComponent(rawCookieValue));
  } catch {
    // noop: keep raw value fallback
  }

  for (const value of candidates) {
    try {
      const parsed = JSON.parse(value);
      if (isSessionUser(parsed)) {
        return parsed;
      }
    } catch {
      // noop: try next candidate
    }
  }

  return null;
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const role = (value as SessionUser).role;
  return (
    role === "ADMIN" ||
    role === "DIRETOR" ||
    role === "GERENTE_COMERCIAL" ||
    role === "SUPERVISOR"
  );
}

