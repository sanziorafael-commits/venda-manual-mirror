import { loginApiResponseSchema } from "@/schemas/auth";
import { ApiError, parseApiError } from "./api-error";
import { clearAuthStore } from "@/stores/auth-store";

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
  | { kind: "success" }
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
  if (ABS_URL.test(path)) return path;
  if (!base) return path;

  const baseWithSlash = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  return baseWithSlash + normalizedPath;
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
) => {
  if (!isBrowser()) return false;
  if (options.token) return false;
  if (!options.retryOnUnauthorized) return false;
  if (isNonRefreshablePath(path)) return false;

  return true;
};

const resolveCredentialsMode = (
  path: string,
  options: InternalApiOptions,
): RequestCredentials => {
  if (!options.fullUrl) {
    return "include";
  }

  if (!ABS_URL.test(path)) {
    return "include";
  }

  const base = getBaseURL();
  if (!base) {
    return "same-origin";
  }

  try {
    const baseOrigin = new URL(base).origin;
    const targetOrigin = new URL(path).origin;
    return baseOrigin === targetOrigin ? "include" : "same-origin";
  } catch {
    return "same-origin";
  }
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
  const url = joinUrl(getBaseURL(), AUTH_REFRESH_PATH);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
      credentials: "include",
    });

    const payload = await parseResponseBody(res);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { kind: "invalid_session" };
      }

      return {
        kind: "temporary_error",
        message:
          parseApiError(payload) || "Não foi possível renovar a sessão.",
      };
    }

    const parsed = loginApiResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        kind: "temporary_error",
        message: "Resposta inválida ao renovar a sessão.",
      };
    }

    return { kind: "success" };
  } catch {
    return {
      kind: "temporary_error",
      message: "Falha temporária ao renovar a sessão. Tente novamente.",
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
  const explicitToken = options.token?.trim() || undefined;
  const url = options.fullUrl ? path : joinUrl(getBaseURL(), path);

  const headers: HeadersInit = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(explicitToken ? { Authorization: `Bearer ${explicitToken}` } : {}),
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
    credentials: resolveCredentialsMode(path, options),
  });

  const data = await parseResponseBody(res);

  if (res.status === 401 && shouldHandleUnauthorized(path, options)) {
    const refreshResult = await refreshAccessTokenSingleFlight();

    if (refreshResult.kind === "success") {
      try {
        return await apiFetchInternal<T>(path, {
          ...options,
          retryOnUnauthorized: false,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAuthStore();
          redirectToLogin();
        }

        throw error;
      }
    }

    if (refreshResult.kind === "invalid_session") {
      clearAuthStore();
      redirectToLogin();
      throw new ApiError("Sessão expirada. Faça login novamente.", 401);
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
