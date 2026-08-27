export type PublicErrorCode =
  | "BAD_REQUEST"
  | "NOT_AUTHENTICATED"
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TEMPORARILY_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class ApplicationError extends Error {
  constructor(
    public readonly code: Exclude<PublicErrorCode, "INTERNAL_ERROR">,
    public readonly safeMessage: string,
    public readonly status: number,
    public readonly retryable = false,
    options?: ErrorOptions,
  ) {
    super(safeMessage, options);
    this.name = "ApplicationError";
  }
}

export interface PublicError {
  code: PublicErrorCode;
  message: string;
  status: number;
  retryable: boolean;
  reference?: string;
}

export function toPublicError(error: unknown, reference?: string): PublicError {
  if (error instanceof ApplicationError) {
    return {
      code: error.code,
      message: error.safeMessage,
      status: error.status,
      retryable: error.retryable,
      reference,
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Your saved records were not changed.",
    status: 500,
    retryable: true,
    reference,
  };
}
