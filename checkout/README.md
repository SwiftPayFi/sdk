# SwiftPay Checkout SDK

Browser and React SDK for accepting stablecoin payments. Supports popup, iframe, and redirect checkout flows with real-time payment status tracking.

## Features

- 🎯 **Multiple checkout modes** — Popup, iframe, or redirect
- 🔄 **Real-time updates** — SSE + polling for payment status
- 🏪 **Marketplace-friendly** — Create multiple invoices with one instance
- 🛡️ **Type-safe** — Full TypeScript support
- 📦 **Lightweight** — ~11 KB minified (IIFE)
- 🌍 **Multi-chain** — Ethereum, Polygon, Solana, Tron support
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
  key: 'pk_live_xxx',           // Your publishable key
  token: 'USDC',                 // Default asset (can override per invoice)
  chains: ['ethereum'],          // Supported chains
  mode: 'iframe',                // popup | iframe | redirect
  sandbox: false,                // Use sandbox API (https://sandbox-api.swiftpay.finance)
});

// 2. Listen for payment events
checkout.on('payment.completed', ({ invoice }) => {
  console.log('✅ Payment completed:', invoice.reference);
  // Update your backend/UI
});

// 3. Create invoice for a product
async function buyProduct(productId, price) {
  const session = await checkout.createInvoice({
    amount: price,
    reference: productId,
    metadata: { productId, userId: currentUser.id },
  });

  if (session) {
    // 4. Open checkout UI
    await checkout.open();
  }
}
```

### React Hook

```typescript
import { useSwiftPayCheckout } from '@swiftpayfi/checkout-sdk/react';

function CheckoutButton({ product }) {
  const {
    createInvoice,
    open,
    isLoading,
    session,
    error,
  } = useSwiftPayCheckout({
    key: 'pk_live_xxx',
    token: 'USDC',
    chains: ['ethereum'],
    sandbox: false,
    onSuccess: ({ invoice }) => {
      console.log('Payment complete:', invoice);
      // Fulfill order
    },
  });

  const handleCheckout = async () => {
    const session = await createInvoice({
      amount: product.price,
      reference: product.id,
    });
    if (session) {
      await open();
    }
  };

  return (
    <button 
      onClick={handleCheckout} 
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : `Buy for $${product.price}`}
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
| `token` | `string` | undefined | Default asset symbol (e.g. `USDC`, `USDT`) — can override per invoice |
| `chains` | `string[]` | undefined | Default chains (e.g. `['ethereum', 'polygon']`) — can override per invoice |
| `mode` | `'popup' \| 'iframe' \| 'redirect'` | `'popup'` | Checkout UI mode |
| `sandbox` | `boolean` | `false` | Use sandbox API endpoint |
| `callbackUrl` | `string` | current page | Redirect destination after payment (for redirect mode) |
| `autoClose` | `boolean` | `true` | Auto-close on payment completion |
| `pollIntervalMs` | `number` | `4000` | Status polling interval in ms |

#### Automatic API Endpoints

```javascript
// Production (default)
sandbox: false
// → https://api.swiftpay.finance

// Sandbox/Testing
sandbox: true
// → https://sandbox-api.swiftpay.finance
```

### Methods

#### `createInvoice(options: CreateInvoiceOptions): Promise<CheckoutSessionResponse>`

Create a new invoice session. Must be called before `open()`.

```typescript
const session = await checkout.createInvoice({
  amount: 99.99,                    // Required: amount in USD
  token: 'USDT',                    // Optional: override default asset
  reference: 'order-12345',         // Optional: your order ID
  chains: ['ethereum', 'solana'],   // Optional: override default chains
  metadata: { orderId: '12345' },   // Optional: custom data
  recipient: '0xaddress',           // Optional: recipient address
  expiresAt: new Date(...),         // Optional: expiry time
});
```

#### `open(options?: { mode?: CheckoutMode }): Promise<CheckoutSessionResponse>`

Open the checkout UI. Requires `createInvoice()` to be called first.

```typescript
// Use instance's default mode
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

Get the iframe DOM element (iframe mode only). Useful for advanced customization.

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
| `error` | `{ error }` | Error during session creation or polling |
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
  instance,           // SwiftPayCheckout | null
  createInvoice,      // (options) => Promise<session | null>
  open,               // (options?) => Promise<session | null>
  close,              // () => void
  isReady,            // boolean
  isLoading,          // boolean (during createInvoice/open)
  session,            // CheckoutSessionResponse | null
  branding,           // MerchantBranding | null
  status,             // InvoiceStatus | null
  error,              // CheckoutSDKError | null
} = useSwiftPayCheckout(options);
```

## Patterns

### Marketplace (Multiple Products)

```javascript
const checkout = new SwiftPayCheckout({ key: 'pk_live_...' });

async function buyProduct(product) {
  // Create invoice for this product
  const session = await checkout.createInvoice({
    amount: product.price,
    reference: product.id,
    metadata: { category: product.category },
  });

  // Show checkout
  if (session) {
    await checkout.open();
  }
}

// Later, buy a different product
await buyProduct(anotherProduct);
```

### Environment Switching

```javascript
const checkout = new SwiftPayCheckout({
  key: process.env.REACT_APP_SWIFTPAY_KEY,
  sandbox: process.env.NODE_ENV === 'development',
});
```

### Iframe with Custom Styling

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

// Access and style the iframe
const iframe = checkout.getIframeElement();
if (iframe) {
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
}
```

### Handling All Payment States

```javascript
checkout.on('payment.pending', ({ invoice }) => {
  // Show "waiting for payment" UI
  updateUI('pending');
});

checkout.on('payment.partial', ({ invoice }) => {
  // Show "partial payment received" with expected amount
  updateUI('partial', {
    received: invoice.pendingAmount,
    expected: invoice.amountExpected,
  });
});

checkout.on('payment.paid', ({ invoice }) => {
  // Show "payment received, confirming..."
  updateUI('confirming');
});

checkout.on('payment.completed', ({ invoice }) => {
  // Payment settled — fulfill order
  updateUI('completed');
  fulfillOrder(invoice.externalRef);
});
```

## Error Handling

```javascript
try {
  const session = await checkout.createInvoice({
    amount: 100,
    reference: 'order-123',
  });

  if (!session) {
    console.error('Failed to create invoice');
    return;
  }

  await checkout.open();
} catch (error) {
  if (error instanceof CheckoutSDKError) {
    console.error('Checkout error:', error.code, error.message);
  }
}

// Listen for errors
checkout.on('error', ({ error }) => {
  console.error('Checkout error:', error.message);
  // Show error UI
});
```

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

### Testing

```bash
# No tests configured yet
npm run test
```

## Publishing

Uses [Changesets](/.changeset/README.md) for version management.

```bash
# Add a changeset when making changes
npx changeset add

# On main: Creates "Version Packages" PR
# On dev: Publishes beta immediately
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Security

- ✅ Uses HTTPS only
- ✅ Publishable key (not secret)
- ✅ CORS configured
- ✅ No sensitive data in logs
- ✅ postMessage origin validation

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](../LICENSE) for details.

**Copyright © 2026 SwiftPay Finance**

## Support

- Documentation: https://docs.swiftpay.finance
- Issues: https://github.com/swiftpayfi/sdk/issues
- Email: support@swiftpay.finance
