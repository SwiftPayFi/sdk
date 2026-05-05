import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

import { x402Fastify } from '../src/fastify.js';

import {
  mockClient,
  MOCK_REQUIREMENTS,
  MOCK_SETTLEMENT_SUCCESS,
  MOCK_SETTLEMENT_FAILURE,
} from './setup.js';

const ENDPOINT_URL = 'https://api.example.com/v1/analyze';

describe('x402Fastify', () => {
  it('returns 402 when x-payment header is missing', async () => {
    const client = mockClient();
    const guard = x402Fastify({ client });

    const app = Fastify();
    app.get('/test', { preHandler: guard(ENDPOINT_URL) }, async () => ({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/test' });

    expect(res.statusCode).toBe(402);
    const body = res.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts).toEqual([MOCK_REQUIREMENTS.requirements]);
  });

  it('serves the route and sets response header on successful settlement', async () => {
    const client = mockClient();
    const guard = x402Fastify({ client });

    const app = Fastify();
    app.get('/test', { preHandler: guard(ENDPOINT_URL) }, async () => ({ ok: true }));

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-payment': 'base64payload' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(res.headers['x-payment-response']).toBe(JSON.stringify(MOCK_SETTLEMENT_SUCCESS));
  });

  it('returns 402 with error when settlement fails', async () => {
    const client = mockClient();
    vi.mocked(client.x402.facilitator.settle).mockResolvedValue(MOCK_SETTLEMENT_FAILURE);
    const guard = x402Fastify({ client });

    const app = Fastify();
    app.get('/test', { preHandler: guard(ENDPOINT_URL) }, async () => ({ ok: true }));

    const res = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { 'x-payment': 'badpayload' },
    });

    expect(res.statusCode).toBe(402);
    const body = res.json();
    expect(body.error).toBe('signature verification failed');
  });

  it('returns 500 when SDK client throws', async () => {
    const client = mockClient();
    vi.mocked(client.x402.endpoints.requirements).mockRejectedValue(new Error('boom'));
    const guard = x402Fastify({ client });

    const app = Fastify();
    app.get('/test', { preHandler: guard(ENDPOINT_URL) }, async () => ({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/test' });

    expect(res.statusCode).toBe(500);
  });
});
