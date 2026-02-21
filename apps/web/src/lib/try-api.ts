import { toast } from "sonner";
import { apiFetch } from "./api-client";
import { parseApiError } from "./api-error";

type ApiSuccessEnvelope<T = unknown> = {
  data: T;
  meta?: unknown;
};

/**
 * Envolve chamadas a apiFetch com toast automático em caso de erro.
 */
export async function tryApiFetch<T = unknown>(
  ...args: Parameters<typeof apiFetch<T>>
): Promise<T | null> {
  try {
    return await apiFetch<T>(...args);
  } catch (err) {
    const message = parseApiError(err);
    toast.error(message);
    return null;
  }
}

export async function tryApiFetchServer<T = unknown>(
  path: string,
  options?: {
    token?: string;
    fullUrl?: boolean;
    headers?: HeadersInit;
  },
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    const message = parseApiError(err);
    if (process.env.NODE_ENV === "development") {
      console.error(`Erro ao fazer fetch SSR de ${path}:`, message);
    }
    return null;
  }
}

/**
 * Faz uma requisição POST com feedback via toast para sucesso e erro.
 */
export async function tryApiPost<T = unknown>(
  path: string,
  body: BodyInit | Record<string, unknown>,
  successMessage = "Operação realizada com sucesso",
): Promise<T | null> {
  try {
    const result = await apiFetch<T>(path, {
      method: "POST",
      body,
    });
    toast.success(successMessage);
    return result;
  } catch (err) {
    const message = parseApiError(err);
    toast.error(message);
    return null;
  }
}

/**
 * Executa POST e retorna apenas o campo `data` da resposta padrao da API.
 */
export async function tryApiPostData<T = unknown>(
  path: string,
  body: BodyInit | Record<string, unknown>,
  successMessage = "Operação realizada com sucesso",
  invalidMessage = "Resposta inesperada da API.",
): Promise<T | null> {
  const response = await tryApiPost<unknown>(path, body, successMessage);

  if (response === null) {
    return null;
  }

  if (typeof response !== "object" || !("data" in response)) {
    toast.error(invalidMessage);
    return null;
  }

  return (response as ApiSuccessEnvelope<T>).data;
}

/**
 * Executa POST, extrai `data` e aplica um parser customizado no payload.
 */
export async function tryApiPostDataParsed<T>(
  path: string,
  body: BodyInit | Record<string, unknown>,
  parseData: (data: unknown) => T | null,
  successMessage = "Operação realizada com sucesso",
  invalidMessage = "Resposta inesperada da API.",
): Promise<T | null> {
  const payload = await tryApiPostData<unknown>(
    path,
    body,
    successMessage,
    invalidMessage,
  );

  if (payload === null) {
    return null;
  }

  const parsed = parseData(payload);
  if (parsed === null) {
    toast.error(invalidMessage);
    return null;
  }

  return parsed;
}

export async function tryApiPatch<T = unknown>(
  path: string,
  body: BodyInit | Record<string, unknown>,
  successMessage?: string,
): Promise<T | null> {
  try {
    const result = await apiFetch<T>(path, {
      method: "PATCH",
      body,
    });
    if (successMessage) toast.success(successMessage);
    return result;
  } catch (err) {
    const message = parseApiError(err);
    toast.error(message);
    return null;
  }
}

export async function tryApiPut<T = unknown>(
  path: string,
  body: BodyInit | Record<string, unknown>,
  successMessage = "Alterações salvas com sucesso",
): Promise<T | null> {
  try {
    const result = await apiFetch<T>(path, {
      method: "PUT",
      body,
    });
    toast.success(successMessage);
    return result;
  } catch (err) {
    const message = parseApiError(err);
    toast.error(message);
    return null;
  }
}

export async function tryApiDelete(
  path: string,
  successMessage = "Registro removido com sucesso",
): Promise<boolean> {
  try {
    await apiFetch(path, { method: "DELETE" });
    toast.success(successMessage);
    return true;
  } catch (err) {
    const message = parseApiError(err);
    toast.error(message || "Erro ao excluir.");
    return false;
  }
}

