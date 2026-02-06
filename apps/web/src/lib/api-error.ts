/**
 * Classe de erro personalizada para uso com apiFetch.
 * Inclui status HTTP.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Tenta extrair a melhor mensagem possivel de um erro retornado pela API.
 */
export function parseApiError(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "Erro inesperado. Verifique seus dados.";
  }

  const err = data as Record<string, unknown>;

  if (typeof err.message === "string") return err.message;
  if (typeof err.error === "string") return err.error;

  if (typeof err.error === "object" && err.error !== null) {
    const nestedError = err.error as Record<string, unknown>;
    if (typeof nestedError.message === "string") return nestedError.message;
  }

  if (Array.isArray(err.errors) && typeof err.errors[0] === "string") {
    return err.errors[0];
  }

  if (Array.isArray(err.errors) && isArrayOfObjectsWithMessage(err.errors)) {
    return err.errors[0].message;
  }

  if (Array.isArray(data) && isArrayOfObjectsWithMessage(data)) {
    return data[0].message;
  }

  return "Erro inesperado. Tente novamente.";
}

function isArrayOfObjectsWithMessage(
  arr: unknown[]
): arr is { message: string }[] {
  return arr.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "message" in item &&
      typeof (item as Record<string, unknown>).message === "string"
  );
}
