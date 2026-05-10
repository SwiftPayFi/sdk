# SwiftPay Checkout SDK

Browser and React SDK for accepting stablecoin payments. Supports popup, iframe, and redirect checkout flows with real-time payment status tracking.

## How it works

The SDK follows a two-step, server-first pattern:

1. **Server-side** — your backend creates an invoice via `POST /v1/invoices` using your **secret key**. This is where payment parameters (amount, token, chains) are set.
2. **Client-side** — the SDK calls `createSession({ invoiceId })` using your **publishable key** to attach a checkout UI to that invoice.

This ensures payment parameters can never be tampered with from the browser.

## Features

- 🎯 **Multiple checkout modes** — Popup, iframe, or redirect
- 🔄 **Real-time updates** — SSE for payment status
- 🛡️ **Type-safe** — Full TypeScript support
- 📦 **Lightweight** — ~11 KB minified (IIFE)
- ⚙️ **Sandbox mode** — Built-in sandbox/production switching

## Installation

### NPM Package

```bash
npm install @swiftpayfi/checkout-sdk
```

### Direct Script Tag (Browser)

```html
<script src="https://cdn.swiftpay.finance/checkout@latest/index.iife.js"></script>
```

## Quick Start

### Vanilla JavaScript

```javascript
import SwiftPayCheckout from '@swiftpayfi/checkout-sdk';

// 1. Initialize once per page
const checkout = new SwiftPayCheckout({
  key: 'pk_live_xxx',   // Your publishable key
  mode: 'iframe',       // popup | iframe | redirect
  sandbox: false,
});

// 2. Listen for payment events
checkout.on('payment.completed', ({ invoice }) => {
  console.log('Payment completed:', invoice.reference);
  // Update your backend/UI
});

// 3. Create a checkout session for a server-created invoice
async function buyProduct(invoiceId) {
  // invoiceId comes from your backend — created via POST /v1/invoices (secret key)
  const session = await checkout.createSession({ invoiceId });

  if (session) {
    // 4. Open checkout UI
    await checkout.open();
  }
}
```

### React Hook

```typescript
import { useSwiftPayCheckout } from '@swiftpayfi/checkout-sdk/react';

function CheckoutButton({ invoiceId }) {
  const {
    createSession,
    open,
    isLoading,
    error,
  } = useSwiftPayCheckout({
    key: 'pk_live_xxx',
    sandbox: false,
    onSuccess: ({ invoice }) => {
      console.log('Payment complete:', invoice);
    },
  });

  const handleCheckout = async () => {
    // invoiceId was created server-side via POST /v1/invoices
    const session = await createSession({ invoiceId });
    if (session) {
      await open();
    }
  };

  return (
    <button onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Pay now'}
    </button>
  );
}
```

## API Reference

### SwiftPayCheckout Constructor

```typescript
new SwiftPayCheckout(options: SwiftPayCheckoutOptions)
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | **required** | Publishable key from dashboard |
| `mode` | `'popup' \| 'iframe' \| 'redirect'` | `'popup'` | Checkout UI mode |
| `sandbox` | `boolean` | `false` | Use sandbox API endpoint |
| `callbackUrl` | `string` | current page | Redirect destination after payment |
| `checkout` | `CheckoutOverrides` | undefined | Default branding overrides, merged with per-session overrides in `createSession` |
| `autoClose` | `boolean` | `true` | Auto-close on payment completion |

#### API Endpoints

```javascript
sandbox: false  // → https://api.swiftpay.finance
sandbox: true   // → https://sandbox-api.swiftpay.finance
```

### Methods

#### `createSession(options: CreateCheckoutSessionOptions): Promise<CheckoutSessionResponse>`

Attach a checkout UI to an existing invoice. Must be called before `open()`.

The invoice must be created server-side via `POST /v1/invoices` using your secret key before calling this method.

```typescript
const session = await checkout.createSession({
  invoiceId: 'uuid-of-server-created-invoice',  // Required
  callbackUrl: 'https://yoursite.com/thanks',   // Optional: overrides SDK-level callbackUrl
  checkout: { accentColor: '#6366f1' },         // Optional: branding overrides for this session
});
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `invoiceId` | `string` (UUID) | **yes** | ID of a pre-existing invoice created server-side |
| `callbackUrl` | `string` | no | Redirect URL after payment — must be in your allowlist |
| `checkout` | `CheckoutOverrides` | no | Per-session branding overrides, merged with SDK-level defaults |

#### `open(options?: { mode?: CheckoutMode }): Promise<CheckoutSessionResponse>`

Open the checkout UI. Requires `createSession()` to be called first.

```typescript
// Use the SDK's default mode
await checkout.open();

// Override mode for this open
await checkout.open({ mode: 'redirect' });
```

#### `close(reason?: CheckoutCloseReason): void`

Close the checkout UI.

```typescript
checkout.close('manual');
```

#### `getIframeElement(): HTMLIFrameElement | null`

Get the iframe DOM element (iframe mode only).

```typescript
const iframe = checkout.getIframeElement();
if (iframe) {
  iframe.style.borderRadius = '16px';
}
```

#### `getSession(): CheckoutSessionResponse | null`

Get the current session data.

```typescript
const session = checkout.getSession();
console.log(session.invoice.status); // 'pending' | 'partial' | 'paid' | 'completed'
console.log(session.branding?.accentColor); // merchant's accent color
```

#### `destroy(): void`

Clean up the checkout instance.

```typescript
checkout.destroy();
```

### Events

Use `.on(event, handler)` to listen for checkout events:

```typescript
checkout.on('payment.completed', ({ invoice, session }) => {
  // Handle completion
});

// Unsubscribe
const unsubscribe = checkout.on('payment.paid', handler);
unsubscribe();
```

#### Event Types

| Event | Payload | When |
|-------|---------|------|
| `ready` | `{ session }` | Session created & ready to open |
| `open` | `{ mode, checkoutUrl, session }` | Checkout UI opened |
| `close` | `{ reason, session? }` | Checkout UI closed |
| `cancel` | `{ reason, session? }` | User cancelled (not auto-closed) |
| `error` | `{ error }` | Error during session creation or payment |
| `status` | `{ status, previousStatus?, invoice, session }` | Invoice status changed |
| `payment.pending` | `{ invoice, session }` | First payment detected |
| `payment.partial` | `{ invoice, session }` | Partial payment received |
| `payment.paid` | `{ invoice, session }` | Full payment received |
| `payment.completed` | `{ invoice, session }` | Payment settled (final status) |
| `redirect` | `{ url, session }` | About to redirect (redirect mode) |
| `expired` | `{ sessionToken, session? }` | Session expired |

### React Hook: useSwiftPayCheckout

```typescript
const {
  instance,         // SwiftPayCheckout | null
  createSession,    // (options: CreateCheckoutSessionOptions) => Promise<session | null>
  open,             // (options?) => Promise<session | null>
  close,            // () => void
  isReady,          // boolean
  isLoading,        // boolean (during createSession/open)
  session,          // CheckoutSessionResponse | null
  branding,         // MerchantBranding | null
  status,           // InvoiceStatus | null
  error,            // CheckoutSDKError | null
} = useSwiftPayCheckout(options);
```

## Types

### `CheckoutOverrides`

Branding overrides the client may supply when creating a session. Only low-risk, non-URL fields are accepted — URL and name fields are always sourced from the merchant's server-side branding to prevent injection via a leaked publishable key.

```typescript
interface CheckoutOverrides {
  accentColor?: string | null;               // e.g. '#6366f1'
  themeMode?: 'light' | 'dark' | 'auto' | null;
  sandbox?: boolean;
}
```

### `CheckoutConfig`

The resolved branding snapshot returned in every session response. Built server-side by merging the merchant's stored branding with any `CheckoutOverrides` supplied at session creation. Immutable after the session is created.

```typescript
interface CheckoutConfig {
  brandName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor?: string | null;
  themeMode?: 'light' | 'dark' | 'auto' | null;
  supportEmail?: string | null;
  termsUrl?: string | null;
  privacyUrl?: string | null;
  sandbox?: boolean;
}
```

### `MerchantBranding`

The UI-ready branding shape on `session.branding`. Contains only the fields the checkout page needs to theme itself — callback hosts and timestamps are excluded.

```typescript
interface MerchantBranding {
  brandName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  themeMode: 'light' | 'dark' | 'auto';
  supportEmail: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
}
```

## Patterns

### Server-side invoice + client-side checkout

```javascript
// Backend (Node.js example) — uses secret key
const invoice = await fetch('https://api.swiftpay.finance/v1/invoices', {
  method: 'POST',
  headers: {
    'X-Swift-Key': process.env.SWIFTPAY_SECRET_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: 'USDC',
    amount: product.price,
    chains: ['evm'],
    metadata: { orderId: order.id },
  }),
}).then(r => r.json());

// Send invoice.data.id to the browser, then:

// Frontend — uses publishable key
const session = await checkout.createSession({ invoiceId: invoice.data.id });
await checkout.open();
```

### Branding overrides

Per-session overrides are merged on top of the merchant's stored branding server-side. Only `accentColor`, `themeMode`, and `sandbox` can be overridden from the browser — URL and name fields are always server-controlled.

```javascript
const session = await checkout.createSession({
  invoiceId,
  checkout: {
    accentColor: '#10b981', // override for this session
    themeMode: 'dark',
  },
});

// The resolved snapshot is available on the session:
console.log(session.branding?.logoUrl);    // from merchant branding (server-controlled)
console.log(session.branding?.accentColor); // '#10b981' (your override)
```

### Environment switching

```javascript
const checkout = new SwiftPayCheckout({
  key: process.env.REACT_APP_SWIFTPAY_KEY,
  sandbox: process.env.NODE_ENV !== 'production',
});
```

### Iframe with custom container

```javascript
const checkout = new SwiftPayCheckout({
  key: 'pk_live_...',
  mode: 'iframe',
  iframe: {
    container: '#checkout-container',
    width: '100%',
    height: '600px',
    title: 'SwiftPay Checkout',
  },
});

const iframe = checkout.getIframeElement();
if (iframe) {
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
}
```

### Handling all payment states

```javascript
checkout.on('payment.pending', ({ invoice }) => {
  updateUI('pending');
});

checkout.on('payment.partial', ({ invoice }) => {
  updateUI('partial', {
    received: invoice.pendingAmount,
    expected: invoice.amountExpected,
  });
});

checkout.on('payment.paid', ({ invoice }) => {
  updateUI('confirming');
});

checkout.on('payment.completed', ({ invoice }) => {
  updateUI('completed');
  fulfillOrder(invoice.externalRef);
});
```

## Error Handling

```javascript
try {
  const session = await checkout.createSession({ invoiceId });
  await checkout.open();
} catch (error) {
  if (error instanceof CheckoutSDKError) {
    console.error('Checkout error:', error.code, error.message);
  }
}

// Listen for async errors
checkout.on('error', ({ error }) => {
  console.error('Checkout error:', error.message);
});
```

#### Common error codes

| Code | Cause |
|------|-------|
| `invalid_options` | Missing or malformed `invoiceId` |
| `no_session` | `open()` called before `createSession()` |
| `origin_forbidden` | Origin not in publishable key's allowlist |
| `http_404` | Invoice not found or doesn't belong to this merchant |
| `session_expired` | Checkout session has expired |
| `instance_destroyed` | Method called after `destroy()` |

## Development

### Build

```bash
npm run build          # All formats (types + ESM + IIFE)
npm run build:types   # TypeScript declarations only
npm run build:esm     # ESM module (for npm)
npm run build:iife    # Standalone browser script
```

### Watch Mode

```bash
npm run dev           # TypeScript compilation with watch
```

## Publishing

Uses [Changesets](/.changeset/README.md) for version management.

```bash
npx changeset add
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Security

- ✅ Payment parameters (amount, token, chains) are set server-side only — never from the browser
- ✅ Publishable key used for checkout UI only — cannot create or mutate invoices
- ✅ Branding overrides restricted to low-risk fields — URL and name fields are always server-controlled
- ✅ HTTPS only
- ✅ CORS configured
- ✅ postMessage origin validation
- ✅ Callback URL validated against merchant's allowlist

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](../LICENSE) for details.

**Copyright © 2026 SwiftPay Finance**

## Support

- Documentation: https://docs.swiftpay.finance
- Issues: https://github.com/swiftpayfi/sdk/issues
- Email: support@swiftpay.finance
