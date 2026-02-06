import { loginApiResponseSchema } from "../schemas/auth";
import {
  clearAuthSession,
  getAccessTokenFromStorage,
  getRefreshTokenFromStorage,
  saveAuthSession,
} from "./auth-session";
import { parseApiError, ApiError } from "./api-error";

export interface ApiOptions {
  method?: string;
  body?: BodyInit | Record<string, unknown>;
  headers?: HeadersInit;
  token?: string;
  fullUrl?: boolean; // se true, usa path como URL completa
}

type InternalApiOptions = ApiOptions & {
  retryOnUnauthorized: boolean;
};

type RefreshResult =
  | { kind: "success"; accessToken: string }
  | { kind: "invalid_session" }
  | { kind: "temporary_error"; message: string };

const AUTH_REFRESH_PATH = "/auth/refresh";
const NON_REFRESHABLE_AUTH_PATHS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/activate-account",
  "/auth/bootstrap-admin",
];

let refreshPromise: Promise<RefreshResult> | null = null;

export const getBaseURL = () => {
  const browserBase = process.env.NEXT_PUBLIC_API_URL;
  const serverBase =
    process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
  return typeof window === "undefined" ? serverBase : browserBase;
};

const ABS_URL = /^https?:\/\//i;

const joinUrl = (base: string | undefined | null, path: string) => {
  if (ABS_URL.test(path)) return path; // ja e absoluta
  if (!base) return path; // fallback relativo (origem do front)
  const b = base.endsWith("/") ? base : `${base}/`;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return b + p;
};

const isBrowser = () => typeof window !== "undefined";

const isNonRefreshablePath = (path: string) => {
  const lowerPath = path.toLowerCase();
  return NON_REFRESHABLE_AUTH_PATHS.some((fragment) =>
    lowerPath.includes(fragment),
  );
};

const shouldHandleUnauthorized = (
  path: string,
  options: InternalApiOptions,
  hasToken: boolean,
) => {
  if (!hasToken) return false;
  if (!isBrowser()) return false;
  if (options.token) return false;
  if (!options.retryOnUnauthorized) return false;
  if (isNonRefreshablePath(path)) return false;

  return true;
};

const redirectToLogin = () => {
  if (!isBrowser()) return;

  const isAlreadyOnLogin = window.location.pathname === "/login";
  if (!isAlreadyOnLogin) {
    window.location.replace("/login");
  }
};

const parseResponseBody = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return { message: `Erro ${res.status}: ${res.statusText}` };
  }
};

async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = getRefreshTokenFromStorage();

  if (!refreshToken) {
    return { kind: "invalid_session" };
  }

  const url = joinUrl(getBaseURL(), AUTH_REFRESH_PATH);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    const payload = await parseResponseBody(res);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { kind: "invalid_session" };
      }

      return {
        kind: "temporary_error",
        message:
          parseApiError(payload) || "Nao foi possivel renovar a sessao.",
      };
    }

    const parsed = loginApiResponseSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        kind: "temporary_error",
        message: "Resposta invalida ao renovar a sessao.",
      };
    }

    saveAuthSession(parsed.data.data);

    return {
      kind: "success",
      accessToken: parsed.data.data.tokens.accessToken,
    };
  } catch {
    return {
      kind: "temporary_error",
      message: "Falha temporaria ao renovar a sessao. Tente novamente.",
    };
  }
}

async function refreshAccessTokenSingleFlight(): Promise<RefreshResult> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function apiFetchInternal<T = unknown>(
  path: string,
  options: InternalApiOptions,
): Promise<T> {
  const token = options.token ?? getAccessTokenFromStorage();
  const hasToken = Boolean(token);
  const url = options.fullUrl ? path : joinUrl(getBaseURL(), path);

  const headers: HeadersInit = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
    cache: "no-store",
  });

  const data = await parseResponseBody(res);

  if (
    res.status === 401 &&
    shouldHandleUnauthorized(path, options, hasToken)
  ) {
    const refreshResult = await refreshAccessTokenSingleFlight();

    if (refreshResult.kind === "success") {
      try {
        return await apiFetchInternal<T>(path, {
          ...options,
          token: refreshResult.accessToken,
          retryOnUnauthorized: false,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAuthSession();
          redirectToLogin();
        }

        throw error;
      }
    }

    if (refreshResult.kind === "invalid_session") {
      clearAuthSession();
      redirectToLogin();
      throw new ApiError("Sessao expirada. Faca login novamente.", 401);
    }

    throw new ApiError(refreshResult.message, 401);
  }

  if (!res.ok) {
    const message = parseApiError(data);
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return data as T;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  return apiFetchInternal<T>(path, {
    ...options,
    retryOnUnauthorized: true,
  });
}
