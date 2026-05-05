import { describe, expect, it, vi } from 'vitest';

import { SwiftPay, SwiftPayConfigError, SwiftPayNotFoundError } from '../../src/index.js';
import { envelope, jsonResponse, mockFetch } from '../setup.js';

const endpointFixture = {
  id: 'e-1',
  merchantId: 'm-1',
  endpointUrl: 'https://api.example.com/v1/analyze',
  description: 'Sentiment analysis',
  asset: 'USDC',
  network: 'eip155:8453',
  amountUsd: 0.1,
  treasuryAddress: '0xMerchant',
  forwarderAddress: '0xForwarder',
  active: true,
  createdAt: '2026-04-30T12:00:00Z',
  updatedAt: '2026-04-30T12:00:00Z',
};

const requirementsFixture = {
  scheme: 'exact',
  network: 'eip155:8453',
  amount: '100000',
  asset: '0xUSDC',
  payTo: '0xForwarder',
  maxTimeoutSeconds: 300,
  description: 'Sentiment analysis',
};

describe('x402.endpoints module', () => {
  describe('auth gating', () => {
    it('throws SwiftPayConfigError when no secretKey is set (every method)', async () => {
      const sdk = new SwiftPay({ fetch: vi.fn() as unknown as typeof globalThis.fetch });
      await expect(
        sdk.x402.endpoints.register({
          endpointUrl: 'https://x',
          asset: 'USDC',
          network: 'eip155:1',
          amountUsd: 0.1,
        }),
      ).rejects.toBeInstanceOf(SwiftPayConfigError);
      await expect(sdk.x402.endpoints.list()).rejects.toBeInstanceOf(SwiftPayConfigError);
      await expect(sdk.x402.endpoints.deactivate('id')).rejects.toBeInstanceOf(SwiftPayConfigError);
      await expect(sdk.x402.endpoints.requirements({ url: 'https://x' })).rejects.toBeInstanceOf(
        SwiftPayConfigError,
      );
      await expect(sdk.x402.endpoints.requirementsById('id')).rejects.toBeInstanceOf(
        SwiftPayConfigError,
      );
    });
  });

  it('register() returns endpoint + camelCased paymentRequirements', async () => {
    const { fetch, calls } = mockFetch(() =>
      jsonResponse(
        envelope({ endpoint: endpointFixture, payment_requirements: requirementsFixture }),
        { status: 201 },
      ),
    );
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    const result = await sdk.x402.endpoints.register({
      endpointUrl: endpointFixture.endpointUrl,
      asset: 'USDC',
      network: 'eip155:8453',
      amountUsd: 0.1,
    });
    expect(result.endpoint).toEqual(endpointFixture);
    expect(result.paymentRequirements).toEqual(requirementsFixture);
    expect(calls[0]?.method).toBe('POST');
  });

  it('list() unwraps the envelope', async () => {
    const { fetch } = mockFetch(() => jsonResponse(envelope([endpointFixture])));
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    const list = await sdk.x402.endpoints.list();
    expect(list).toEqual([endpointFixture]);
  });

  it('deactivate() sends DELETE and returns void', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse({ success: true, data: null }));
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    await expect(sdk.x402.endpoints.deactivate('e-1')).resolves.toBeUndefined();
    expect(calls[0]?.method).toBe('DELETE');
    expect(calls[0]?.url).toMatch(/\/v1\/x402\/endpoints\/e-1$/);
  });

  it('requirements() URL-encodes the url query parameter', async () => {
    const { fetch, calls } = mockFetch(() =>
      jsonResponse(envelope({ x402Version: 2, requirements: requirementsFixture })),
    );
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    const result = await sdk.x402.endpoints.requirements({
      url: 'https://api.example.com/v1/analyze',
    });
    expect(result.requirements).toEqual(requirementsFixture);
    expect(calls[0]?.url).toContain(encodeURIComponent('https://api.example.com/v1/analyze'));
  });

  it('requirementsById() returns the requirements envelope', async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse(envelope({ x402Version: 2, requirements: requirementsFixture })),
    );
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    const result = await sdk.x402.endpoints.requirementsById('e-1');
    expect(result.x402Version).toBe(2);
  });

  it('requirements() surfaces 404 as SwiftPayNotFoundError', async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse({ success: false, error: 'No active endpoint found' }, { status: 404 }),
    );
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    await expect(sdk.x402.endpoints.requirements({ url: 'https://nope' })).rejects.toBeInstanceOf(
      SwiftPayNotFoundError,
    );
  });
});
