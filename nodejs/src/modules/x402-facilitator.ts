import type { HTTPClient } from '../client.js';
import type {
  FacilitatorRequest,
  PaymentStatusResponse,
  SettlementResponse,
  SupportedResponse,
  VerifyResponse,
} from '../types.js';

/**
 * x402 facilitator endpoints. No authentication required — the protocol carries
 * its own EIP-712 signatures end-to-end.
 */
export class X402FacilitatorModule {
  constructor(private readonly http: HTTPClient) {}

  /** GET /v1/x402/supported — list supported network/scheme combinations. */
  async supported(): Promise<SupportedResponse> {
    return this.http.request<SupportedResponse>({
      method: 'GET',
      path: '/v1/x402/supported',
    });
  }

  /** POST /v1/x402/verify — validate a payment payload without on-chain side effects. */
  async verify(body: FacilitatorRequest): Promise<VerifyResponse> {
    return this.http.request<VerifyResponse>({
      method: 'POST',
      path: '/v1/x402/verify',
      body,
    });
  }

  /**
   * POST /v1/x402/settle — execute the on-chain transfer.
   *
   * The OpenAPI spec returns `SettlementResponse` for both 200 (success) and
   * 422 (settlement failed). This method returns the body for both — inspect
   * `success` / `error` to decide. All other 4xx/5xx still throw.
   */
  async settle(body: FacilitatorRequest): Promise<SettlementResponse> {
    const raw = await this.http.requestRaw<SettlementResponse>({
      method: 'POST',
      path: '/v1/x402/settle',
      body,
      acceptStatuses: [422],
    });
    return raw.body;
  }

  /** GET /v1/x402/payments/status — look up a payment by its EIP-3009 nonce. */
  async paymentStatus(params: { nonce: string }): Promise<PaymentStatusResponse> {
    return this.http.request<PaymentStatusResponse>({
      method: 'GET',
      path: '/v1/x402/payments/status',
      query: { nonce: params.nonce },
    });
  }
}
