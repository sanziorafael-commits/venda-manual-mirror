import {
  authSessionUserSchema,
  type AuthSession,
  type AuthToken,
  type AuthUser,
} from "@/schemas/auth";

const ACCESS_TOKEN_KEY = "handsell.access_token";
const REFRESH_TOKEN_KEY = "handsell.refresh_token";
const TOKEN_EXPIRES_IN_KEY = "handsell.token_expires_in";
const USER_KEY = "handsell.user";

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveAuthSession(payload: AuthSession) {
  if (!isBrowser()) return;

  window.localStorage.setItem(ACCESS_TOKEN_KEY, payload.tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, payload.tokens.refreshToken);
  window.localStorage.setItem(TOKEN_EXPIRES_IN_KEY, payload.tokens.expiresIn);
  window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

export function getAccessTokenFromStorage() {
  if (!isBrowser()) return undefined;

  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return token?.trim() ? token : undefined;
}

export function getRefreshTokenFromStorage() {
  if (!isBrowser()) return undefined;

  const token = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  return token?.trim() ? token : undefined;
}

export function getTokenTtlFromStorage() {
  if (!isBrowser()) return undefined;

  const ttl = window.localStorage.getItem(TOKEN_EXPIRES_IN_KEY);
  return ttl?.trim() ? ttl : undefined;
}

export function getUserFromStorage(): AuthUser | undefined {
  if (!isBrowser()) return undefined;

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return undefined;

  try {
    const parsed = authSessionUserSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function clearAuthSession() {
  if (!isBrowser()) return;

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_EXPIRES_IN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export type StoredAuthToken = AuthToken;
