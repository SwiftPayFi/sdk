import { vi } from 'vitest';

export interface MockCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface MockHandle {
  fetch: typeof globalThis.fetch;
  calls: MockCall[];
}

/**
 * Build a fetch mock that records every call (URL, method, headers, parsed body)
 * and produces responses via the supplied handler. The mock is async so handlers
 * can simulate latency or rejection.
 */
export function mockFetch(handler: (call: MockCall) => Response | Promise<Response>): MockHandle {
  const calls: MockCall[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const headers = normaliseHeaders(init.headers);
    let body: unknown = undefined;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    } else if (init.body !== undefined) {
      body = init.body;
    }
    const call: MockCall = { url, method: init.method ?? 'GET', headers, body };
    calls.push(call);
    return handler(call);
  });
  return { fetch: fn as unknown as typeof globalThis.fetch, calls };
}

export function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
}

export function envelope<T>(
  data: T,
  metadata?: unknown,
): { success: true; data: T; metadata?: unknown } {
  return metadata !== undefined ? { success: true, data, metadata } : { success: true, data };
}

function normaliseHeaders(input: HeadersInit | undefined): Record<string, string> {
  if (!input) return {};
  const out: Record<string, string> = {};
  if (input instanceof Headers) {
    input.forEach((v, k) => {
      out[k.toLowerCase()] = v;
    });
    return out;
  }
  if (Array.isArray(input)) {
    for (const [k, v] of input) out[k.toLowerCase()] = v;
    return out;
  }
  for (const [k, v] of Object.entries(input)) out[k.toLowerCase()] = String(v);
  return out;
}
