import { describe, it, expect, vi } from 'vitest';

import { handleX402Request } from '../src/core.js';

import {
  mockClient,
  MOCK_REQUIREMENTS,
  MOCK_SETTLEMENT_SUCCESS,
  MOCK_SETTLEMENT_FAILURE,
} from './setup.js';

const ENDPOINT_URL = 'https://api.example.com/v1/analyze';

describe('handleX402Request', () => {
  it('returns 402 body when no payment header is provided', async () => {
    const client = mockClient();

    const result = await handleX402Request(client, ENDPOINT_URL, undefined);

    expect(result.settled).toBe(false);
    if (!result.settled) {
      expect(result.body.x402Version).toBe(1);
      expect(result.body.accepts).toEqual([MOCK_REQUIREMENTS.requirements]);
      expect(result.body.error).toBeUndefined();
    }

    expect(client.x402.endpoints.requirements).toHaveBeenCalledWith({ url: ENDPOINT_URL });
    expect(client.x402.facilitator.settle).not.toHaveBeenCalled();
  });

  it('settles successfully when payment header is provided', async () => {
    const client = mockClient();
    const paymentHeader = 'base64encodedpayload';

    const result = await handleX402Request(client, ENDPOINT_URL, paymentHeader);

    expect(result.settled).toBe(true);
    if (result.settled) {
      expect(result.response).toEqual(MOCK_SETTLEMENT_SUCCESS);
    }

    expect(client.x402.facilitator.settle).toHaveBeenCalledWith({
      x402Version: MOCK_REQUIREMENTS.x402Version,
      paymentPayload: paymentHeader,
      paymentRequirements: MOCK_REQUIREMENTS.requirements,
    });
  });

  it('returns 402 with error when settlement fails', async () => {
    const client = mockClient();
    vi.mocked(client.x402.facilitator.settle).mockResolvedValue(MOCK_SETTLEMENT_FAILURE);

    const result = await handleX402Request(client, ENDPOINT_URL, 'badpayload');

    expect(result.settled).toBe(false);
    if (!result.settled) {
      expect(result.body.error).toBe('signature verification failed');
      expect(result.body.accepts).toEqual([MOCK_REQUIREMENTS.requirements]);
    }
  });

  it('uses requirementsById when target is not a URL', async () => {
    const client = mockClient();

    await handleX402Request(client, 'ep_abc123', undefined);

    expect(client.x402.endpoints.requirementsById).toHaveBeenCalledWith('ep_abc123');
    expect(client.x402.endpoints.requirements).not.toHaveBeenCalled();
  });

  it('uses requirements by URL when target starts with http', async () => {
    const client = mockClient();

    await handleX402Request(client, ENDPOINT_URL, undefined);

    expect(client.x402.endpoints.requirements).toHaveBeenCalledWith({ url: ENDPOINT_URL });
    expect(client.x402.endpoints.requirementsById).not.toHaveBeenCalled();
  });

  it('propagates errors from the SDK client', async () => {
    const client = mockClient();
    vi.mocked(client.x402.endpoints.requirements).mockRejectedValue(new Error('network timeout'));

    await expect(handleX402Request(client, ENDPOINT_URL, undefined)).rejects.toThrow(
      'network timeout',
    );
  });
});
