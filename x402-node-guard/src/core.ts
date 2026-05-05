import type { SettlementResponse, SwiftPay } from '@swiftpayfi/api-client';

import type { X402PaymentRequired } from './types.js';

export interface X402Rejected {
  settled: false;
  body: X402PaymentRequired;
}

export interface X402Settled {
  settled: true;
  response: SettlementResponse;
}

export type X402Outcome = X402Rejected | X402Settled;

export async function handleX402Request(
  client: SwiftPay,
  target: string,
  paymentHeader: string | undefined,
): Promise<X402Outcome> {
  const isUrl = target.startsWith('http://') || target.startsWith('https://');
  const { x402Version, requirements } = isUrl
    ? await client.x402.endpoints.requirements({ url: target })
    : await client.x402.endpoints.requirementsById(target);

  if (!paymentHeader) {
    return {
      settled: false,
      body: { x402Version, accepts: [requirements] },
    };
  }

  const result = await client.x402.facilitator.settle({
    x402Version,
    paymentPayload: paymentHeader,
    paymentRequirements: requirements,
  });

  if (!result.success) {
    return {
      settled: false,
      body: { x402Version, accepts: [requirements], error: result.error },
    };
  }

  return { settled: true, response: result };
}
