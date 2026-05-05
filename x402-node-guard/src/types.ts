import type { SwiftPay } from '@swiftpayfi/api-client';

export interface X402GuardConfig {
  client: SwiftPay;
}

export interface X402PaymentRequired {
  x402Version: number;
  accepts: unknown[];
  error?: string;
}
