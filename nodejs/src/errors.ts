// Typed error hierarchy mapped from the OpenAPI ErrorResponse envelope.
// Consumers can `instanceof`-check the specific subclass they care about and
// fall back to the base class for everything else.

export interface SwiftPayErrorOptions {
  status?: number;
  details?: Record<string, unknown>;
  traceId?: string;
  cause?: unknown;
}

export class SwiftPayError extends Error {
  status?: number;
  details?: Record<string, unknown>;
  traceId?: string;

  constructor(message: string, opts: SwiftPayErrorOptions = {}) {
    super(message);
    this.name = 'SwiftPayError';
    this.status = opts.status;
    this.details = opts.details;
    this.traceId = opts.traceId;
    if (opts.cause !== undefined) {
      // ts-doesn't-know-about-error-cause-yet
      (this as unknown as { cause: unknown }).cause = opts.cause;
    }
  }
}

/** Misconfiguration on the client side (missing secret key, bad baseUrl). */
export class SwiftPayConfigError extends SwiftPayError {
  constructor(message: string, opts: SwiftPayErrorOptions = {}) {
    super(message, opts);
    this.name = 'SwiftPayConfigError';
  }
}

/** 400 Bad Request — input validation failed; `details` carries field-level hints. */
export class SwiftPayValidationError extends SwiftPayError {
  constructor(message: string, opts: SwiftPayErrorOptions = {}) {
    super(message, opts);
    this.name = 'SwiftPayValidationError';
  }
}

/** 401 Unauthorized — missing or invalid API key. */
export class SwiftPayAuthError extends SwiftPayError {
  constructor(message: string, opts: SwiftPayErrorOptions = {}) {
    super(message, opts);
    this.name = 'SwiftPayAuthError';
  }
}

/** 404 Not Found. */
export class SwiftPayNotFoundError extends SwiftPayError {
  constructor(message: string, opts: SwiftPayErrorOptions = {}) {
    super(message, opts);
    this.name = 'SwiftPayNotFoundError';
  }
}

/** 5xx, transport errors, malformed responses. */
export class SwiftPayServerError extends SwiftPayError {
  constructor(message: string, opts: SwiftPayErrorOptions = {}) {
    super(message, opts);
    this.name = 'SwiftPayServerError';
  }
}

/** Maps an HTTP status to the right error subclass. */
export function errorForStatus(
  status: number,
  message: string,
  opts: Omit<SwiftPayErrorOptions, 'status'> = {},
): SwiftPayError {
  const full = { ...opts, status };
  if (status === 400) return new SwiftPayValidationError(message, full);
  if (status === 401) return new SwiftPayAuthError(message, full);
  if (status === 404) return new SwiftPayNotFoundError(message, full);
  if (status >= 500) return new SwiftPayServerError(message, full);
  return new SwiftPayError(message, full);
}
