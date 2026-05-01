import type { HTTPClient } from '../client.js';
import type { ChainConfig, TokenConfig } from '../types.js';

/**
 * Public utility endpoints. No authentication required.
 */
export class UtilsModule {
  constructor(private readonly http: HTTPClient) {}

  /** GET /v1/utils/chains — list all supported EVM chains. */
  async listChains(): Promise<ChainConfig[]> {
    return this.http.request<ChainConfig[]>({ method: 'GET', path: '/v1/utils/chains' });
  }

  /** GET /v1/utils/tokens — list all supported tokens with per-chain deployment info. */
  async listTokens(): Promise<TokenConfig[]> {
    return this.http.request<TokenConfig[]>({ method: 'GET', path: '/v1/utils/tokens' });
  }
}
