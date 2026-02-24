import type { Request, Response, CookieOptions } from 'express';

import { env } from '../config/env.js';

import { ttlToMs } from './time.js';

export const AUTH_ACCESS_COOKIE_NAME = 'handsell.access_token';
export const AUTH_REFRESH_COOKIE_NAME = 'handsell.refresh_token';
export const AUTH_USER_COOKIE_NAME = 'handsell.user';

function resolveCookieDomain() {
  if (env.NODE_ENV !== 'production') {
    return undefined;
  }

  const configuredDomain = env.AUTH_COOKIE_DOMAIN?.trim();
  if (configuredDomain) {
    return configuredDomain;
  }

  return '.handsell.com.br';
}

const COOKIE_DOMAIN = resolveCookieDomain();

const COOKIE_BASE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
  ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
};

export function setAuthCookies(
  res: Response,
  input: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      company_id: string | null;
      role: string;
      full_name: string;
      email: string | null;
    };
  },
) {
  res.cookie(AUTH_ACCESS_COOKIE_NAME, input.access_token, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: ttlToMs(env.JWT_ACCESS_TOKEN_TTL),
  });

  res.cookie(AUTH_REFRESH_COOKIE_NAME, input.refresh_token, {
    ...COOKIE_BASE_OPTIONS,
    maxAge: ttlToMs(env.JWT_REFRESH_TOKEN_TTL),
  });

  res.cookie(AUTH_USER_COOKIE_NAME, encodeURIComponent(JSON.stringify(input.user)), {
    ...COOKIE_BASE_OPTIONS,
    maxAge: ttlToMs(env.JWT_REFRESH_TOKEN_TTL),
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(AUTH_ACCESS_COOKIE_NAME, COOKIE_BASE_OPTIONS);
  res.clearCookie(AUTH_REFRESH_COOKIE_NAME, COOKIE_BASE_OPTIONS);
  res.clearCookie(AUTH_USER_COOKIE_NAME, COOKIE_BASE_OPTIONS);
}

export function getRefreshTokenFromRequest(req: Request) {
  const bodyToken =
    typeof req.body?.refresh_token === 'string' ? req.body.refresh_token : undefined;
  if (bodyToken?.trim()) {
    return bodyToken.trim();
  }

  const cookieToken = getCookieValue(req, AUTH_REFRESH_COOKIE_NAME);
  return cookieToken?.trim() ? cookieToken : undefined;
}

export function getAccessTokenFromRequest(req: Request) {
  const cookieToken = getCookieValue(req, AUTH_ACCESS_COOKIE_NAME);
  return cookieToken?.trim() ? cookieToken : undefined;
}

export function getCookieValue(req: Request, key: string) {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return undefined;

  const pairs = rawCookie.split(';');

  for (const pair of pairs) {
    const [rawKey, ...rawValueParts] = pair.trim().split('=');
    if (!rawKey) continue;
    if (rawKey !== key) continue;

    const rawValue = rawValueParts.join('=');
    if (!rawValue) return '';

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return undefined;
}
