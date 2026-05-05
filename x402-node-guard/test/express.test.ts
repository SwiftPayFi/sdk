import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

import { x402Express } from '../src/express.js';

import {
  mockClient,
  MOCK_REQUIREMENTS,
  MOCK_SETTLEMENT_SUCCESS,
  MOCK_SETTLEMENT_FAILURE,
} from './setup.js';

const ENDPOINT_URL = 'https://api.example.com/v1/analyze';

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
}

describe('x402Express', () => {
  let next: NextFunction & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn();
  });

  it('returns 402 when x-payment header is missing', async () => {
    const client = mockClient();
    const guard = x402Express({ client })(ENDPOINT_URL);
    const req = mockReq();
    const res = mockRes();

    guard(req, res, next);
    await vi.waitFor(() => expect(res.status).toHaveBeenCalled());

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({
      x402Version: 1,
      accepts: [MOCK_REQUIREMENTS.requirements],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets response header on successful settlement', async () => {
    const client = mockClient();
    const guard = x402Express({ client })(ENDPOINT_URL);
    const req = mockReq({ 'x-payment': 'base64payload' });
    const res = mockRes();

    guard(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-PAYMENT-RESPONSE',
      JSON.stringify(MOCK_SETTLEMENT_SUCCESS),
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 402 with error when settlement fails', async () => {
    const client = mockClient();
    vi.mocked(client.x402.facilitator.settle).mockResolvedValue(MOCK_SETTLEMENT_FAILURE);
    const guard = x402Express({ client })(ENDPOINT_URL);
    const req = mockReq({ 'x-payment': 'badpayload' });
    const res = mockRes();

    guard(req, res, next);
    await vi.waitFor(() => expect(res.status).toHaveBeenCalled());

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({
      x402Version: 1,
      accepts: [MOCK_REQUIREMENTS.requirements],
      error: 'signature verification failed',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards SDK errors to next()', async () => {
    const client = mockClient();
    const err = new Error('boom');
    vi.mocked(client.x402.endpoints.requirements).mockRejectedValue(err);
    const guard = x402Express({ client })(ENDPOINT_URL);
    const req = mockReq();
    const res = mockRes();

    guard(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalled());

    expect(next).toHaveBeenCalledWith(err);
  });
});
