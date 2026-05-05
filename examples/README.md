# SwiftPay Checkout SDK Examples

This directory contains working examples of how to integrate the SwiftPay Checkout SDK into your applications.

## Requirements

- **Node.js** 16+ (for React example)
- **Local SDK build** — Both examples use the local checkout SDK from `../checkout/`

⚠️ **Important:** You must build the SDK before running either example:

```bash
cd ../checkout
npm install
npm run build
cd ../examples
```

This generates the compiled SDK files that the examples depend on.

## Quick Setup

To run either example, start here:

```bash
# 1. Build the local SDK (required for both examples)
cd ../checkout
npm install
npm run build

# 2. Run the example you want
cd ../examples

# For React:
cd react
npm install
npm run dev

# For HTML: Use a local server
cd html
python -m http.server 8000  # or npx http-server
```

Then:
- **React:** Open [http://localhost:5173](http://localhost:5173)
- **HTML:** Open [http://localhost:8000](http://localhost:8000)

Both examples will load the **local SDK** from `../../checkout/dist/`

## Examples

### 1. HTML / Vanilla JavaScript (`./html/`)

A complete standalone HTML example using the IIFE bundle of the SwiftPay Checkout SDK.

**Features:**
- Multiple checkout modes (popup, iframe, redirect)
- Product grid with buy buttons
- Real-time payment status updates
- Event listeners for all payment states
- Responsive design
- No build step required

**Getting Started:**

1. Build the SDK first:
   ```bash
   cd ../checkout
   npm run build
   cd ../examples
   ```

2. Open `html/index.html` in your browser (use a local server for best results)
   ```bash
   # Option 1: Python
   python -m http.server 8000
   
   # Option 2: Node.js
   npx http-server
   
   # Option 3: VS Code Live Server extension
   ```

3. Update the publishable key in the HTML file (around line 310):
   ```javascript
   const publishableKey = 'pk_live_YOUR_KEY_HERE';
   ```
4. Get your key from [https://dashboard.swiftpay.finance](https://dashboard.swiftpay.finance)

**Key Files:**
- `html/index.html` — Complete example with styling and functionality

**Key Concepts:**
```javascript
// Initialize once
const checkout = new SwiftPayCheckout({
  key: 'pk_live_xxx',
  mode: 'popup', // popup | iframe | redirect
  sandbox: true,
});

// Listen to events
checkout.on('payment.completed', ({ invoice }) => {
  console.log('Payment done:', invoice.reference);
});

// Create invoice and open
const session = await checkout.createInvoice({
  amount: 99.99,
  reference: 'order-123',
});
await checkout.open();
```

### 2. React (`./react/`)

A complete React application demonstrating the `useSwiftPayCheckout` hook.

**Features:**
- React 19 with TypeScript
- Custom `useSwiftPayCheckout` hook
- Component-based architecture
- Vite build tooling
- Real-time status display
- Mode switching (popup/iframe/redirect)
- Message toast notifications

**Getting Started:**

1. Build the SDK first:
   ```bash
   cd ../checkout
   npm run build
   cd ../react
   ```

2. Install dependencies and run dev server:
   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173)

**Update your key:**
Edit `src/App.tsx` line 65:
```typescript
key: 'pk_live_YOUR_KEY_HERE', // Replace with your publishable key
```

**Key Files:**
- `src/App.tsx` — Main app component with product grid
- `src/components/ProductCard.tsx` — Individual product component
- `src/components/ModeSelector.tsx` — Checkout mode selector
- `src/components/CheckoutStatus.tsx` — Status display
- `src/components/MessageList.tsx` — Toast notifications
- `vite.config.ts` — Build configuration

**Key Concepts:**
```typescript
const {
  createInvoice,
  open,
  isLoading,
  session,
  status,
  error,
} = useSwiftPayCheckout({
  key: 'pk_live_xxx',
  mode: 'popup',
  sandbox: true,
  onSuccess: ({ invoice }) => {
    console.log('Payment complete:', invoice);
  },
});

// Create invoice
const session = await createInvoice({
  amount: 99.99,
  reference: 'order-123',
});

// Open checkout
await open();
```

## API Reference

### SwiftPayCheckout Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | **required** | Publishable key from dashboard |
| `token` | `string` | undefined | Default asset (USDC, USDT, etc.) |
| `chains` | `string[]` | undefined | Supported chains (ethereum, polygon, etc.) |
| `mode` | `'popup' \| 'iframe' \| 'redirect'` | `'popup'` | Checkout UI mode |
| `sandbox` | `boolean` | `false` | Use sandbox API |
| `callbackUrl` | `string` | current page | Redirect destination (redirect mode) |
| `autoClose` | `boolean` | `true` | Auto-close on completion |
| `pollIntervalMs` | `number` | `4000` | Status polling interval |

### createInvoice Options

```typescript
{
  amount: number;              // USD amount
  token?: string;              // Override default asset
  reference?: string;          // Your order ID
  chains?: string[];           // Override chains
  metadata?: Record<string, any>; // Custom data
  recipient?: string;          // Recipient address
  expiresAt?: Date;            // Expiry time
}
```

### Event Types

| Event | Payload | When |
|-------|---------|------|
| `ready` | `{ session }` | Session created |
| `open` | `{ mode, checkoutUrl, session }` | UI opened |
| `close` | `{ reason, session? }` | UI closed |
| `cancel` | `{ reason, session? }` | User cancelled |
| `error` | `{ error }` | Error occurred |
| `status` | `{ status, invoice, session }` | Status changed |
| `payment.pending` | `{ invoice, session }` | Payment detected |
| `payment.partial` | `{ invoice, session }` | Partial payment |
| `payment.paid` | `{ invoice, session }` | Full payment |
| `payment.completed` | `{ invoice, session }` | Payment settled |
| `redirect` | `{ url, session }` | About to redirect |
| `expired` | `{ sessionToken, session? }` | Session expired |

## Common Patterns

### Handling Payment States

```javascript
checkout.on('payment.pending', () => {
  // Show "waiting for payment" UI
  updateUI('Waiting for payment...');
});

checkout.on('payment.partial', ({ invoice }) => {
  // Show partial progress
  updateUI(`Received ${invoice.pendingAmount} / ${invoice.amountExpected}`);
});

checkout.on('payment.paid', () => {
  // Show "confirming" UI
  updateUI('Confirming payment...');
});

checkout.on('payment.completed', ({ invoice }) => {
  // Fulfill the order
  fulfillOrder(invoice.reference);
});
```

### Marketplace Pattern

Use a single checkout instance for multiple products:

```javascript
const checkout = new SwiftPayCheckout({ key: 'pk_live_...' });

async function buyProduct(product) {
  const session = await checkout.createInvoice({
    amount: product.price,
    reference: product.id,
    metadata: { productId: product.id },
  });
  
  if (session) {
    await checkout.open();
  }
}

// Buy multiple products
await buyProduct(product1);
// ... later ...
await buyProduct(product2);
```

### Environment Switching

**HTML:**
```javascript
const isDev = window.location.hostname === 'localhost';
const checkout = new SwiftPayCheckout({
  key: isDev ? 'pk_test_...' : 'pk_live_...',
  sandbox: isDev,
});
```

**React:**
```typescript
const checkout = useSwiftPayCheckout({
  key: import.meta.env.VITE_SWIFTPAY_KEY,
  sandbox: import.meta.env.DEV,
});
```

## Checkout Modes

### Popup
Opens checkout in a modal popup on the current page. User can close it manually or it auto-closes on completion.

```javascript
const checkout = new SwiftPayCheckout({ mode: 'popup' });
await checkout.open();
```

### Iframe
Embeds checkout directly in the page. Useful for seamless integration.

```html
<!-- HTML -->
<div id="checkout-container"></div>

<script>
  const checkout = new SwiftPayCheckout({
    mode: 'iframe',
    iframe: {
      container: '#checkout-container',
      width: '100%',
      height: '600px',
    },
  });
  
  await checkout.open();
</script>
```

### Redirect
Redirects user to hosted checkout page. Best for mobile or when you want full SwiftPay UI.

```javascript
const checkout = new SwiftPayCheckout({
  mode: 'redirect',
  callbackUrl: 'https://yoursite.com/checkout-success',
});

await checkout.open(); // Redirects to hosted checkout
```

## Testing

### Use Sandbox API

Set `sandbox: true` to use the sandbox API for testing without real transactions:

```javascript
const checkout = new SwiftPayCheckout({
  key: 'pk_live_xxx', // Works with live keys in sandbox mode
  sandbox: true,
});
```

### Test Payment States

The sandbox environment supports simulating different payment states for testing your UI.

## Troubleshooting

### "Cannot find publishable key"
- Make sure you've added your key to the initialization
- Get it from [https://dashboard.swiftpay.finance](https://dashboard.swiftpay.finance)
- Keys start with `pk_`

### Iframe not appearing
- Make sure the container element exists in the DOM
- Verify the container ID matches in the iframe config
- Check browser console for errors

### Events not firing
- Verify you're using `.on()` to register listeners
- Make sure you call `await checkout.open()` before events can fire
- Check that polling interval is not too long (default 4000ms)

### CORS errors
- SwiftPay API endpoints have CORS configured for browser requests
- Check that your publishable key is correct

## Support

- **Documentation:** [https://docs.swiftpay.finance](https://docs.swiftpay.finance)
- **API Issues:** [https://github.com/swiftpayfi/sdk/issues](https://github.com/swiftpayfi/sdk/issues)
- **Email:** support@swiftpay.finance

## License

Apache License 2.0. See [../LICENSE](../LICENSE) for details.
