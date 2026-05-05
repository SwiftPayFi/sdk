import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

import { handleX402Request } from './core.js';
import type { X402GuardConfig } from './types.js';

export function x402Fastify(config: X402GuardConfig): (target: string) => preHandlerHookHandler {
  const { client } = config;

  return (target: string): preHandlerHookHandler => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const paymentHeader = request.headers['x-payment'] as string | undefined;

      const outcome = await handleX402Request(client, target, paymentHeader);

      if (!outcome.settled) {
        reply.code(402).send(outcome.body);
        return;
      }

      reply.header('X-PAYMENT-RESPONSE', JSON.stringify(outcome.response));
    };
  };
}
