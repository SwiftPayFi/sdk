import { errorForStatus, SwiftPayError, SwiftPayServerError } from './errors.js';
import type { ApiErrorBody } from './types.js';

const DEFAULT_BASE_URL = 'https://api.swiftpay.finance';
const DEFAULT_TIMEOUT_MS = 30_000;

export interface SwiftPayConfig {
  /** Secret API key (`sk_live_*`). Optional — only required for secret-scoped modules. */
  secretKey?: string;
  /** Override the API base URL. Defaults to https://api.swiftpay.finance. */
  baseUrl?: string;
  /** Custom fetch implementation. Defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
}

export interface RequestOptions<TQuery extends Record<string, unknown> = Record<string, unknown>> {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  path: string;
  query?: TQuery;
  body?: unknown;
  /** When true, the caller wants the raw envelope to inspect status-driven semantics
   *  (used by /v1/x402/settle which returns 200 and 422 with the same body shape). */
  acceptStatuses?: number[];
}

export interface RawResponse<T> {
  status: number;
  body: T;
}

/**
 * Thin fetch wrapper. Owns: header injection, query serialisation, timeout,
 * error mapping. No retries, no caching — those belong at the application layer.
 */
export class HTTPClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  private readonly getSecretKey: () => string | undefined;

  constructor(config: SwiftPayConfig, getSecretKey: () => string | undefined) {
    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(baseUrl)) {
      throw new SwiftPayError(`Invalid baseUrl: ${baseUrl} — must start with http:// or https://`);
    }
    this.baseUrl = baseUrl;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== 'function') {
      throw new SwiftPayError(
        'No fetch implementation available — pass { fetch } or run on a platform with global fetch (Node 18+).',
      );
    }
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.getSecretKey = getSecretKey;
  }

  /** Perform a request and return the unwrapped `data` field from the SwiftPay
   *  envelope. For endpoints that don't use the envelope (facilitator), the raw
   *  body is returned. */
  async request<T>(opts: RequestOptions): Promise<T> {
    const raw = await this.requestRaw<unknown>(opts);
    return extractData<T>(raw.body, raw.status);
  }

  /** Perform a request and return the unparsed-but-decoded body + status. The
   *  caller is responsible for unwrapping any envelope. Used by methods that
   *  need both `data` and `metadata` (e.g. paginated list responses). */
  async requestRaw<T>(opts: RequestOptions): Promise<RawResponse<T>> {
    const url = this.buildUrl(opts.path, opts.query);
    const headers: Record<string, string> = {
      accept: 'application/json',
    };
    const secretKey = this.getSecretKey();
    if (secretKey) headers['x-swift-key'] = secretKey;

    let bodyInit: BodyInit | undefined;
    if (opts.body !== undefined) {
      headers['content-type'] = 'application/json';
      bodyInit = JSON.stringify(opts.body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: opts.method,
        headers,
        body: bodyInit,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new SwiftPayServerError(
          `Request to ${opts.path} timed out after ${this.timeoutMs}ms`,
          {
            cause: err,
          },
        );
      }
      throw new SwiftPayServerError(
        `Network error calling ${opts.path}: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
    clearTimeout(timer);

    const text = await response.text();
    const parsed = parseJson(text);

    // Caller opted into seeing this status code as a non-throw.
    if (opts.acceptStatuses?.includes(response.status)) {
      return { status: response.status, body: parsed as T };
    }

    if (response.status >= 200 && response.status < 300) {
      if (parsed === undefined) {
        throw new SwiftPayServerError(`Empty response body (status ${response.status})`, {
          status: response.status,
        });
      }
      return { status: response.status, body: parsed as T };
    }

    // Map error responses to typed errors.
    const errBody = parsed as ApiErrorBody | undefined;
    const message = errBody?.error ?? `HTTP ${response.status}`;
    throw errorForStatus(response.status, message, {
      details: errBody?.details,
      traceId: errBody?.traceId,
    });
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    let url = this.baseUrl + (path.startsWith('/') ? path : `/${path}`);
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        params.append(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractData<T>(parsed: unknown, status: number): T {
  // SwiftPay envelopes everything envelope-shaped responses: { success: true, data, metadata? }.
  // Facilitator endpoints (verify, settle, supported, payments/status) return the
  // body directly with no envelope — return as-is.
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as { success?: boolean; data?: unknown };
    if (obj.success === true && 'data' in obj) {
      return obj.data as T;
    }
  }
  if (parsed === undefined) {
    throw new SwiftPayServerError(`Empty response body (status ${status})`, { status });
  }
  return parsed as T;
}
