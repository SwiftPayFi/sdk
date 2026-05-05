import { vi } from 'vitest';

import type { SwiftPay } from '@swiftpayfi/api-client';

export const MOCK_REQUIREMENTS = {
  x402Version: 1,
  requirements: {
    scheme: 'exact',
    network: 'eip155:8453',
    amount: '100000',
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    payTo: '0xmerchant',
    maxTimeoutSeconds: 300,
    extra: { name: 'SwiftPay', version: '1', merchantId: 'm1', endpointId: 'e1' },
    description: '$0.10 per call',
  },
};

export const MOCK_SETTLEMENT_SUCCESS = {
  success: true as const,
  transaction: '0xtxhash',
  network: 'eip155:8453',
  payer: '0xpayer',
  amount: '100000',
  asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  paymentId: 'pay_123',
  settledAt: '2026-05-04T12:00:00Z',
};

export const MOCK_SETTLEMENT_FAILURE = {
  success: false as const,
  error: 'signature verification failed',
};

export function mockClient(): SwiftPay {
  return {
    x402: {
      endpoints: {
        requirements: vi.fn().mockResolvedValue(MOCK_REQUIREMENTS),
        requirementsById: vi.fn().mockResolvedValue(MOCK_REQUIREMENTS),
      },
      facilitator: {
        settle: vi.fn().mockResolvedValue(MOCK_SETTLEMENT_SUCCESS),
      },
    },
  } as unknown as SwiftPay;
}
