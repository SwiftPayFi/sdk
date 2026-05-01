import { HTTPClient, type SwiftPayConfig } from './client.js';
import { makeRequireSecretKey } from './internal/require-auth.js';
import { InvoicesModule } from './modules/invoices.js';
import { UtilsModule } from './modules/utils.js';
import { X402EndpointsModule } from './modules/x402-endpoints.js';
import { X402FacilitatorModule } from './modules/x402-facilitator.js';

export {
  SwiftPayError,
  SwiftPayConfigError,
  SwiftPayValidationError,
  SwiftPayAuthError,
  SwiftPayNotFoundError,
  SwiftPayServerError,
} from './errors.js';

export type { SwiftPayConfig } from './client.js';
export type { CreateInvoiceResult } from './modules/invoices.js';
export type * from './types.js';

/**
 * Top-level SwiftPay client. Construct once and reuse for the lifetime of the
 * process — modules are stateless wrappers around a shared HTTPClient.
 */
export class SwiftPay {
  /** Public utilities (chains, tokens). No authentication. */
  readonly utils: UtilsModule;

  /** Invoice management. Requires a secret API key. */
  readonly invoices: InvoicesModule;

  /** x402 namespace, grouping the facilitator (public) and endpoint registration (secret-key). */
  readonly x402: {
    facilitator: X402FacilitatorModule;
    endpoints: X402EndpointsModule;
  };

  constructor(config: SwiftPayConfig = {}) {
    let secretKey = config.secretKey;
    const getSecretKey = (): string | undefined => secretKey;
    const requireSecretKey = makeRequireSecretKey(getSecretKey);
    const http = new HTTPClient(config, getSecretKey);

    this.utils = new UtilsModule(http);
    this.invoices = new InvoicesModule(http, requireSecretKey);
    this.x402 = {
      facilitator: new X402FacilitatorModule(http),
      endpoints: new X402EndpointsModule(http, requireSecretKey),
    };

    // expose a setter for rotated keys without rebuilding modules
    Object.defineProperty(this, 'secretKey', {
      enumerable: false,
      configurable: false,
      get: () => secretKey,
      set: (v: string | undefined) => {
        secretKey = v;
      },
    });
  }
}
