import { describe, expect, it, vi } from 'vitest';

import {
  SwiftPay,
  SwiftPayAuthError,
  SwiftPayError,
  SwiftPayNotFoundError,
  SwiftPayServerError,
  SwiftPayValidationError,
} from '../src/index.js';

import { envelope, jsonResponse, mockFetch } from './setup.js';

describe('HTTPClient', () => {
  it('injects X-Swift-Key when secretKey is configured', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse(envelope([])));
    const client = new SwiftPay({ secretKey: 'sk_test_abc', fetch });
    await client.invoices.list();
    expect(calls[0]?.headers['x-swift-key']).toBe('sk_test_abc');
  });

  it('omits X-Swift-Key when no secretKey is configured', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse([]));
    const client = new SwiftPay({ fetch });
    await client.utils.listChains();
    expect(calls[0]?.headers['x-swift-key']).toBeUndefined();
  });

  it('uses a custom baseUrl', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse([]));
    const client = new SwiftPay({ baseUrl: 'https://staging.swiftpay.finance', fetch });
    await client.utils.listChains();
    expect(calls[0]?.url.startsWith('https://staging.swiftpay.finance/v1/utils/chains')).toBe(true);
  });

  it('strips trailing slashes from baseUrl', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse([]));
    const client = new SwiftPay({ baseUrl: 'https://api.swiftpay.finance//', fetch });
    await client.utils.listChains();
    expect(calls[0]?.url).toBe('https://api.swiftpay.finance/v1/utils/chains');
  });

  it('rejects an obviously bad baseUrl', () => {
    expect(() => new SwiftPay({ baseUrl: 'not-a-url' })).toThrow(SwiftPayError);
  });

  it('serialises query parameters and skips undefined/null', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse(envelope([], { pagination: {} })));
    const client = new SwiftPay({ secretKey: 'sk_test_x', fetch });
    await client.invoices.list({ page: 2, limit: undefined });
    expect(calls[0]?.url).toMatch(/\?page=2$/);
  });

  it('maps 400 to SwiftPayValidationError with details', async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse(
        { success: false, error: 'Validation failed', details: { token: 'required' } },
        { status: 400 },
      ),
    );
    const client = new SwiftPay({ secretKey: 'sk', fetch });
    await expect(
      client.invoices.create({ amount: '1', token: '', network: 'ethereum' }),
    ).rejects.toBeInstanceOf(SwiftPayValidationError);
    try {
      await client.invoices.create({ amount: '1', token: '', network: 'ethereum' });
    } catch (err) {
      expect((err as SwiftPayValidationError).details).toEqual({ token: 'required' });
      expect((err as SwiftPayValidationError).status).toBe(400);
    }
  });

  it('maps 401 to SwiftPayAuthError', async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse({ success: false, error: 'Invalid or missing API key' }, { status: 401 }),
    );
    const client = new SwiftPay({ secretKey: 'sk', fetch });
    await expect(client.invoices.list()).rejects.toBeInstanceOf(SwiftPayAuthError);
  });

  it('maps 404 to SwiftPayNotFoundError', async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse({ success: false, error: 'Invoice not found' }, { status: 404 }),
    );
    const client = new SwiftPay({ secretKey: 'sk', fetch });
    await expect(client.invoices.get('does-not-exist')).rejects.toBeInstanceOf(
      SwiftPayNotFoundError,
    );
  });

  it('maps 502 to SwiftPayServerError', async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse({ success: false, error: 'upstream rpc error' }, { status: 502 }),
    );
    const client = new SwiftPay({ secretKey: 'sk', fetch });
    await expect(client.invoices.rescan('id', { chain: 'ethereum' })).rejects.toBeInstanceOf(
      SwiftPayServerError,
    );
  });

  it('wraps network errors as SwiftPayServerError', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof globalThis.fetch;
    const client = new SwiftPay({ fetch });
    await expect(client.utils.listChains()).rejects.toBeInstanceOf(SwiftPayServerError);
  });

  it('honours timeout via AbortController', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init: RequestInit = {}) => {
      // Wait until aborted.
      return new Promise<Response>((_, reject) => {
        init.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    }) as unknown as typeof globalThis.fetch;
    const client = new SwiftPay({ fetch, timeoutMs: 10 });
    await expect(client.utils.listChains()).rejects.toMatchObject({
      name: 'SwiftPayServerError',
      message: expect.stringMatching(/timed out/),
    });
  });

  it('rejects when no fetch implementation is available', () => {
    const original = globalThis.fetch;
    // @ts-expect-error force it away for the constructor path
    delete (globalThis as { fetch?: unknown }).fetch;
    try {
      expect(() => new SwiftPay({})).toThrow(SwiftPayError);
    } finally {
      (globalThis as { fetch: typeof original }).fetch = original;
    }
  });
});
