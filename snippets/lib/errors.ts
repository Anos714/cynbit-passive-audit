// snippets/lib/errors.ts
// One JSON error envelope for API routes and action wrappers.
//
// Rules:
// - The client gets a stable code and a correlation ID, never a stack trace.
// - The correlation ID is also returned in x-correlation-id so a support
//   ticket can be matched to a server log line.
// - 429 responses carry Retry-After in seconds.

export type ErrorCode = 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'INTERNAL';

export type FieldErrors = Record<string, string[] | undefined>;

export function newCorrelationId(): string {
  return crypto.randomUUID();
}

export function jsonError(input: {
  code: ErrorCode;
  message: string;
  status: number;
  correlationId: string;
  retryAfter?: number;
  fieldErrors?: FieldErrors;
}): Response {
  const body = {
    error: {
      code: input.code,
      message: input.message,
      correlationId: input.correlationId,
      ...(input.fieldErrors ? { fieldErrors: input.fieldErrors } : {}),
      ...(input.retryAfter ? { retryAfter: input.retryAfter } : {}),
    },
  };

  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-correlation-id': input.correlationId,
  });

  if (input.retryAfter) {
    headers.set('retry-after', String(input.retryAfter));
  }

  return Response.json(body, { status: input.status, headers });
}
