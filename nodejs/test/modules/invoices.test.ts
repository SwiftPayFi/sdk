import { describe, expect, it, vi } from 'vitest';

import { SwiftPay, SwiftPayConfigError } from '../../src/index.js';
import { envelope, jsonResponse, mockFetch } from '../setup.js';

const invoiceFixture = {
  id: 'inv-1',
  merchantId: 'm-1',
  externalRef: 'order_1',
  reference: 'SP-2024-001',
  addresses: [],
  recipient: null,
  tokenAddress: '0xA0b8...',
  tokenSymbol: 'USDC',
  targetNetwork: 'ethereum',
  amountExpected: '100.00',
  pendingAmount: '100.00',
  receivedAmount: '0.00',
  platformFee: '0.00',
  amountRemitted: '0.00',
  overpaidAmount: '0.00',
  status: 'pending' as const,
  expiresAt: '2026-04-30T11:00:00Z',
  createdAt: '2026-04-30T10:00:00Z',
  paidAt: null,
  completedAt: null,
  metadata: {},
  transactions: [],
};

const txFixture = {
  id: 'tx-1',
  invoiceId: 'inv-1',
  invoiceRef: 'SP-2024-001',
  merchantId: 'm-1',
  txHash: '0xabc',
  chain: 'ethereum',
  asset: 'USDC',
  tokenAddress: '0xA0b8...',
  amount: '100.00',
  fee: '1.00',
  merchantAmount: '99.00',
  status: 'confirmed' as const,
  type: 'payment' as const,
  blockNumber: 19500000,
  blockTimestamp: '2026-04-30T10:04:48Z',
  confirmedAt: '2026-04-30T10:05:30Z',
  createdAt: '2026-04-30T10:05:00Z',
};

describe('invoices module', () => {
  describe('auth gating', () => {
    it('throws SwiftPayConfigError when no secretKey is set (every method)', async () => {
      const sdk = new SwiftPay({ fetch: vi.fn() as unknown as typeof globalThis.fetch });
      await expect(
        sdk.invoices.create({ amount: '1', token: 'USDC', network: 'ethereum' }),
      ).rejects.toBeInstanceOf(SwiftPayConfigError);
      await expect(sdk.invoices.list()).rejects.toBeInstanceOf(SwiftPayConfigError);
      await expect(sdk.invoices.get('id')).rejects.toBeInstanceOf(SwiftPayConfigError);
      await expect(sdk.invoices.listTransactions('id')).rejects.toBeInstanceOf(SwiftPayConfigError);
      await expect(sdk.invoices.rescan('id', { chain: 'ethereum' })).rejects.toBeInstanceOf(
        SwiftPayConfigError,
      );
    });
  });

  describe('create()', () => {
    it('reports created=true on 201', async () => {
      const { fetch, calls } = mockFetch(() =>
        jsonResponse(envelope(invoiceFixture), { status: 201 }),
      );
      const sdk = new SwiftPay({ secretKey: 'sk', fetch });
      const result = await sdk.invoices.create({
        amount: '100.00',
        token: 'USDC',
        network: 'ethereum',
      });
      expect(result.created).toBe(true);
      expect(result.invoice).toEqual(invoiceFixture);
      expect(calls[0]?.method).toBe('POST');
      expect(calls[0]?.url).toMatch(/\/v1\/invoices$/);
      expect((calls[0]?.body as { token?: string })?.token).toBe('USDC');
    });

    it('reports created=false on 200 (idempotent hit)', async () => {
      const { fetch } = mockFetch(() => jsonResponse(envelope(invoiceFixture), { status: 200 }));
      const sdk = new SwiftPay({ secretKey: 'sk', fetch });
      const result = await sdk.invoices.create({
        amount: '100.00',
        token: 'USDC',
        network: 'ethereum',
      });
      expect(result.created).toBe(false);
    });
  });

  describe('list()', () => {
    it('returns invoices and pagination metadata', async () => {
      const { fetch, calls } = mockFetch(() =>
        jsonResponse(
          envelope([invoiceFixture], {
            pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
          }),
        ),
      );
      const sdk = new SwiftPay({ secretKey: 'sk', fetch });
      const result = await sdk.invoices.list({ page: 2, limit: 10 });
      expect(result.invoices).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
      expect(calls[0]?.url).toContain('page=2');
      expect(calls[0]?.url).toContain('limit=10');
    });

    it('falls back to a default pagination shape when metadata is missing', async () => {
      const { fetch } = mockFetch(() => jsonResponse(envelope([])));
      const sdk = new SwiftPay({ secretKey: 'sk', fetch });
      const result = await sdk.invoices.list();
      expect(result.invoices).toEqual([]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(0);
    });
  });

  it('get() URL-encodes the id', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse(envelope(invoiceFixture)));
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    await sdk.invoices.get('weird id/with slash');
    expect(calls[0]?.url).toContain('weird%20id%2Fwith%20slash');
  });

  it('listTransactions() returns the transaction array', async () => {
    const { fetch } = mockFetch(() => jsonResponse(envelope([txFixture])));
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    const txs = await sdk.invoices.listTransactions('inv-1');
    expect(txs).toEqual([txFixture]);
  });

  it('rescan() POSTs the body and returns the count', async () => {
    const { fetch, calls } = mockFetch(() => jsonResponse(envelope({ found: 2 })));
    const sdk = new SwiftPay({ secretKey: 'sk', fetch });
    const result = await sdk.invoices.rescan('inv-1', { chain: 'ethereum', txHash: '0xabc' });
    expect(result).toEqual({ found: 2 });
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.body).toEqual({ chain: 'ethereum', txHash: '0xabc' });
  });
});
