import { describe, expect, it } from 'vitest';

import { SwiftPay } from '../../src/index.js';
import { jsonResponse, mockFetch } from '../setup.js';

const supportedFixture = {
  kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }],
  extensions: [],
  signers: { 'eip155:*': ['0xSigner'] },
};

const facilitatorRequest = {
  x402Version: 2,
  paymentPayload: 'eyJ4NDAyVmVyc2lvbiI6Miw...',
  paymentRequirements: {
    scheme: 'exact',
    network: 'eip155:8453',
    amount: '100000',
    asset: '0xUSDC',
    payTo: '0xForwarder',
    maxTimeoutSeconds: 300,
  },
};

describe('x402.facilitator module', () => {
  it('supported() returns SupportedResponse (no envelope)', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse(supportedFixture));
    const client = new SwiftPay({ fetch });
    const result = await client.x402.facilitator.supported();
    expect(result).toEqual(supportedFixture);
    expect(calls[0]?.url).toMatch(/\/v1\/x402\/supported$/);
  });

  it('verify() returns isValid=true for a valid payment', async () => {
    const { fetch } = mockFetch(() => jsonResponse({ isValid: true, payer: '0xpayer' }));
    const client = new SwiftPay({ fetch });
    const result = await client.x402.facilitator.verify(facilitatorRequest);
    expect(result.isValid).toBe(true);
    expect(result.payer).toBe('0xpayer');
  });

  it('verify() returns isValid=false with invalidReason', async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse({ isValid: false, invalidReason: 'payment_expired' }),
    );
    const client = new SwiftPay({ fetch });
    const result = await client.x402.facilitator.verify(facilitatorRequest);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('payment_expired');
  });

  describe('settle()', () => {
    it('returns SettlementResponse on 200', async () => {
      const { fetch } = mockFetch(() =>
        jsonResponse({
          success: true,
          transaction: '0xtx',
          network: 'eip155:8453',
          payer: '0xpayer',
          amount: '100000',
          asset: '0xUSDC',
          paymentId: 'p-1',
          settledAt: '2026-04-30T12:00:00Z',
        }),
      );
      const client = new SwiftPay({ fetch });
      const result = await client.x402.facilitator.settle(facilitatorRequest);
      expect(result.success).toBe(true);
      expect(result.transaction).toBe('0xtx');
    });

    it('returns SettlementResponse on 422 instead of throwing', async () => {
      const { fetch } = mockFetch(() =>
        jsonResponse({ success: false, error: 'payment_expired' }, { status: 422 }),
      );
      const client = new SwiftPay({ fetch });
      const result = await client.x402.facilitator.settle(facilitatorRequest);
      expect(result.success).toBe(false);
      expect(result.error).toBe('payment_expired');
    });

    it('still throws on 400 (malformed request)', async () => {
      const { fetch } = mockFetch(() =>
        jsonResponse({ success: false, error: 'bad request' }, { status: 400 }),
      );
      const client = new SwiftPay({ fetch });
      await expect(client.x402.facilitator.settle(facilitatorRequest)).rejects.toThrow();
    });
  });

  describe('paymentStatus()', () => {
    it('returns settled status', async () => {
      const { fetch, calls } = mockFetch(() =>
        jsonResponse({
          nonce: '0xnonce',
          status: 'settled',
          paymentId: 'p-1',
          transaction: '0xtx',
          settledAt: '2026-04-30T12:00:00Z',
        }),
      );
      const client = new SwiftPay({ fetch });
      const result = await client.x402.facilitator.paymentStatus({ nonce: '0xnonce' });
      expect(result.status).toBe('settled');
      expect(calls[0]?.url).toContain('nonce=0xnonce');
    });

    it('returns not_found for an unknown nonce', async () => {
      const { fetch } = mockFetch(() => jsonResponse({ nonce: '0xnonce', status: 'not_found' }));
      const client = new SwiftPay({ fetch });
      const result = await client.x402.facilitator.paymentStatus({ nonce: '0xnonce' });
      expect(result.status).toBe('not_found');
    });
  });
});
