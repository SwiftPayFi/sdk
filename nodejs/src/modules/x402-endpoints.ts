import type { HTTPClient } from '../client.js';
import type {
  PaymentRequirements,
  RegisterX402EndpointRequest,
  RegisterX402EndpointResult,
  RequirementsResponse,
  X402EndpointResponse,
} from '../types.js';

/**
 * x402 endpoint registration & discovery. Requires a secret API key.
 */
export class X402EndpointsModule {
  constructor(
    private readonly http: HTTPClient,
    private readonly requireSecretKey: (op: string) => void,
  ) {}

  /** POST /v1/x402/endpoints — register a new endpoint and get its PaymentRequirements. */
  async register(body: RegisterX402EndpointRequest): Promise<RegisterX402EndpointResult> {
    this.requireSecretKey('x402.endpoints.register');
    const data = await this.http.request<{
      endpoint: X402EndpointResponse;
      payment_requirements: PaymentRequirements;
    }>({
      method: 'POST',
      path: '/v1/x402/endpoints',
      body,
    });
    return {
      endpoint: data.endpoint,
      paymentRequirements: data.payment_requirements,
    };
  }

  /** GET /v1/x402/endpoints — list all endpoints registered for this merchant. */
  async list(): Promise<X402EndpointResponse[]> {
    this.requireSecretKey('x402.endpoints.list');
    return this.http.request<X402EndpointResponse[]>({
      method: 'GET',
      path: '/v1/x402/endpoints',
    });
  }

  /** DELETE /v1/x402/endpoints/{id} — soft-delete an endpoint. */
  async deactivate(id: string): Promise<void> {
    this.requireSecretKey('x402.endpoints.deactivate');
    await this.http.requestRaw<unknown>({
      method: 'DELETE',
      path: `/v1/x402/endpoints/${encodeURIComponent(id)}`,
    });
  }

  /** GET /v1/x402/endpoints/requirements?url=... — look up requirements by endpoint URL. */
  async requirements(params: { url: string }): Promise<RequirementsResponse> {
    this.requireSecretKey('x402.endpoints.requirements');
    return this.http.request<RequirementsResponse>({
      method: 'GET',
      path: '/v1/x402/endpoints/requirements',
      query: { url: params.url },
    });
  }

  /** GET /v1/x402/endpoints/{id}/requirements — look up requirements by endpoint UUID. */
  async requirementsById(id: string): Promise<RequirementsResponse> {
    this.requireSecretKey('x402.endpoints.requirementsById');
    return this.http.request<RequirementsResponse>({
      method: 'GET',
      path: `/v1/x402/endpoints/${encodeURIComponent(id)}/requirements`,
    });
  }
}
