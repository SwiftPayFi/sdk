# @swiftpayfi/api-client

Server-side TypeScript SDK for the [SwiftPay](https://swiftpay.finance) REST API. Mirrors the published [Documentation](https://docs.swiftpay.finance) — zero hidden behaviour.

- **Zero runtime dependencies.** Uses the platform `fetch`.
- **ESM-only.** Node ≥ 18, Cloudflare Workers, Vercel Edge, Deno, Bun.
- **Auth-aware modules.** Methods that need a secret key throw `SwiftPayConfigError` when the key is missing — at call time, not silently as a 401 round-trip.
- **Typed errors.** Each HTTP status maps to a discriminated subclass.

## Install

```bash
npm install @swiftpayfi/api-client
```

## Quick start

```ts
import { SwiftPay } from '@swiftpayfi/api-client';

const client = new SwiftPay({
  secretKey: process.env.SWIFTPAY_SECRET_KEY, // optional — required only for secret-scoped modules
});

// Create an invoice
const { invoice, created } = await client.invoices.create({
  amount: '100.00',
  token: 'USDC',
  network: 'ethereum',
  recipients: { evm: '0xYourWallet...' },
  externalRef: 'order_8675309',
});

console.log(created ? 'New invoice' : 'Idempotent hit', invoice.id);
```

## Configuration

```ts
new SwiftPay({
  secretKey: 'sk_live_...',                    // optional
  baseUrl: 'https://api.swiftpay.finance',     // optional, defaults to production
  fetch: globalThis.fetch,                     // optional, dependency-injectable
  timeoutMs: 30_000,                           // optional, default 30s
});
```

## Modules

### `utils` (no auth)

```ts
await client.utils.listChains();
await client.utils.listTokens();
```

### `invoices` (secret key)

```ts
await client.invoices.create({ amount, token, network, recipients, externalRef?, expiresIn?, metadata? });
await client.invoices.list({ page?, limit? });
await client.invoices.get(invoiceId);
await client.invoices.listTransactions(invoiceId);
await client.invoices.rescan(invoiceId, { chain, txHash?, fromBlock? });
```

### `x402.facilitator` (no auth)

```ts
await client.x402.facilitator.supported();
await client.x402.facilitator.verify({ x402Version, paymentPayload, paymentRequirements });
await client.x402.facilitator.settle({ x402Version, paymentPayload, paymentRequirements });
await client.x402.facilitator.paymentStatus({ nonce });
```

`settle()` returns `SettlementResponse` for both 200 (settled) and 422 (settlement failed). Inspect `success` / `error` to decide what to do. All other 4xx / 5xx responses throw a typed `SwiftPayError`.

### `x402.endpoints` (secret key)

```ts
await client.x402.endpoints.register({ endpointUrl, asset, network, amountUsd, description? });
await client.x402.endpoints.list();
await client.x402.endpoints.deactivate(endpointId);
await client.x402.endpoints.requirements({ url });
await client.x402.endpoints.requirementsById(endpointId);
```

## Error handling

```ts
import {
  SwiftPay,
  SwiftPayError,
  SwiftPayValidationError,
  SwiftPayAuthError,
  SwiftPayNotFoundError,
  SwiftPayConfigError,
  SwiftPayServerError,
} from '@swiftpayfi/api-client';

try {
  await client.invoices.create({ amount: '', token: 'USDC', network: 'ethereum' });
} catch (err) {
  if (err instanceof SwiftPayValidationError) {
    console.error('Bad input:', err.details);
  } else if (err instanceof SwiftPayAuthError) {
    console.error('Bad API key');
  } else if (err instanceof SwiftPayError) {
    console.error('SwiftPay error', err.status, err.message, err.traceId);
  } else {
    throw err;
  }
}
```

## Versioning

This SDK is pinned to one major version of the SwiftPay REST API. Each `@swiftpayfi/api-client` major maps 1:1 to a SwiftPay API major:

| SDK            | API path prefix |
| -------------- | --------------- |
| `0.x` / `1.x`  | `/v1/...`       |

When SwiftPay ships `/v2`, we'll release `@swiftpayfi/api-client@2.0.0` with regenerated types. Pin the SDK in your `package.json` the same way you'd pin any breaking-change-prone library:

```jsonc
"dependencies": {
  "@swiftpayfi/api-client": "^1.0.0"
}
```

Within a major, we follow [SemVer](https://semver.org): patches for bug fixes, minors for additive features, no breaking changes.

## Development

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.
