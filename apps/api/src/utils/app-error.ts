export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function unauthorized(message = 'Não autorizado') {
  return new AppError(401, 'unauthorized', message);
}

export function accountPendingPassword(details?: unknown) {
  return new AppError(
    403,
    'ACCOUNT_PENDING_PASSWORD',
    'Conta pendente de ativação de senha',
    details,
  );
}

export function forbidden(message = 'Acesso negado') {
  return new AppError(403, 'forbidden', message);
}

export function badRequest(message: string, details?: unknown) {
  return new AppError(400, 'bad_request', message, details);
}

export function conflict(message: string, details?: unknown) {
  return new AppError(409, 'conflict', message, details);
}

export function notFound(message: string) {
  return new AppError(404, 'not_found', message);
}
