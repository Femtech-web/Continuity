export type IntegrationErrorCode =
  | "ACCOUNT_NOT_FOUND"
  | "AUTH_REQUIRED"
  | "CONFIG_REQUIRED"
  | "INVALID_ADDRESS"
  | "INVALID_RESPONSE"
  | "RATE_LIMITED"
  | "UNSUPPORTED_ASSET"
  | "UPSTREAM_UNAVAILABLE";

export class IntegrationError extends Error {
  readonly code: IntegrationErrorCode;
  readonly retryable: boolean;
  readonly status: number;

  constructor(
    code: IntegrationErrorCode,
    message: string,
    options: { readonly retryable: boolean; readonly status: number },
  ) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

export function integrationErrorResponse(error: unknown): Response {
  if (error instanceof IntegrationError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      },
      {
        status: error.status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(
    {
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "The integration request could not be completed.",
        retryable: true,
      },
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
