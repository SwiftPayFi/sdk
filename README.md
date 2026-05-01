# SwiftPay SDKs

Official SDKs for integrating SwiftPay payment infrastructure into your applications.

## 📦 Available SDKs

### Checkout SDK (`./checkout/`)

Browser and React SDK for accepting stablecoin payments via popup, iframe, or redirect flows.

- **Package**: `@swiftpay/checkout-sdk`
- **Platforms**: Browser, React, vanilla JavaScript
- **Size**: ~11 KB minified (IIFE)
- **Status**: ✅ Production-ready
- **[Documentation](./checkout/README.md)**

```javascript
import SwiftPayCheckout from '@swiftpay/checkout-sdk';

const checkout = new SwiftPayCheckout({ key: 'pk_live_...' });
const session = await checkout.createInvoice({ amount: 100, reference: 'order-123' });
await checkout.open();
```

### Node.js SDK (`./nodejs/`)

Backend SDK for Node.js/TypeScript applications. Create invoices, manage webhooks, and handle payments server-side.

- **Package**: `@swiftpay/sdk`
- **Platforms**: Node.js 18+, TypeScript
- **Status**: ✅ Production-ready
- **[Documentation](./nodejs/README.md)**

```javascript
import { SwiftPay } from '@swiftpay/sdk';

const client = new SwiftPay({ apiKey: 'sk_live_...' });
const invoice = await client.invoices.create({
  amount: 100,
  token: 'USDC',
  reference: 'order-123',
});
```

### Python SDK (`./python/`)

Backend SDK for Python applications. Create invoices, manage webhooks, and handle payments server-side.

- **Package**: `swiftpay`
- **Platforms**: Python 3.8+
- **Status**: ✅ Production-ready
- **[Documentation](./python/README.md)**

```python
from swiftpay import SwiftPay

client = SwiftPay(api_key='sk_live_...')
invoice = client.invoices.create(
    amount=100,
    token='USDC',
    reference='order-123'
)
```

## 🚀 Quick Start

### Installation

```bash
# Checkout SDK (npm)
npm install @swiftpay/checkout-sdk

# Or use from CDN
<script src="https://cdn.swiftpay.finance/checkout@latest/index.iife.js"></script>
```

### Basic Usage

```javascript
// Initialize checkout
const checkout = new SwiftPayCheckout({
  key: 'pk_live_xxx',      // Your publishable key
  sandbox: false,          // Production API
  mode: 'iframe',          // popup | iframe | redirect
});

// Listen for payment completion
checkout.on('payment.completed', ({ invoice }) => {
  console.log('Payment received:', invoice.reference);
});

// Create an invoice
const session = await checkout.createInvoice({
  amount: 99.99,
  reference: 'order-12345',
});

// Open checkout UI
if (session) {
  await checkout.open();
}
```

# Selecting the Right SDK

| Use Case | SDK | Language |
|----------|-----|----------|
| **Browser/Frontend Checkout** | [Checkout](./checkout/) | TypeScript/React |
| **Backend Integration** | [Node.js](./nodejs/) | TypeScript/Node.js |
| **Backend Integration** | [Python](./python/) | Python |

### SDK Comparison

| Feature | Checkout | Node.js | Python |
|---------|----------|---------|--------|
| Invoice Creation | ❌ Backend API | ✅ | ✅ |
| Payment Detection | ✅ Polling/SSE | ✅ Webhooks | ✅ Webhooks |
| Checkout UI | ✅ | ❌ | ❌ |
| Webhook Management | ❌ | ✅ | ✅ |
| Type Safety | ✅ TypeScript | ✅ TypeScript | ✅ Type hints |
| Size | 11 KB | ~100 KB | ~50 KB |

## 🚀 Getting Started by Use Case

### Frontend Checkout
1. Install: `npm install @swiftpay/checkout-sdk`
2. Read: [Checkout SDK Docs](./checkout/README.md)
3. Integrate: Use popup, iframe, or redirect mode

### Backend Server (Node.js)
1. Install: `npm install @swiftpay/sdk`
2. Read: [Node.js SDK Docs](./nodejs/README.md)
3. Integrate: Create invoices, handle webhooks

### Backend Server (Python)
1. Install: `pip install swiftpay`
2. Read: [Python SDK Docs](./python/README.md)
3. Integrate: Create invoices, handle webhooks

## 📂 Repository Structure

```
sdk/
├── checkout/                      # Browser/React checkout SDK (TypeScript)
│   ├── src/
│   │   ├── index.ts              # Main SDK class
│   │   └── react.ts              # React hook
│   ├── dist/                      # Compiled & minified output
│   ├── package.json
│   ├── README.md                  # Complete documentation
│   └── .gitignore
│
├── nodejs/                        # Backend SDK (Node.js/TypeScript)
│   ├── src/
│   ├── dist/
│   ├── test/
│   ├── package.json
│   ├── README.md                  # Complete documentation
│   └── vitest.config.ts           # Testing configuration
│
├── python/                        # Backend SDK (Python)
│   ├── src/
│   ├── tests/
│   ├── pyproject.toml
│   ├── README.md                  # Complete documentation
│   └── .python-version
│
├── .github/workflows/
│   ├── checkout-ci.yml            # Checkout SDK CI
│   ├── checkout-release.yml       # Checkout SDK release
│   ├── nodejs-ci.yml              # Node.js SDK CI
│   ├── nodejs-release.yml         # Node.js SDK release
│   ├── python-ci.yml              # Python SDK CI
│   └── python-release.yml         # Python SDK release
│
├── .changeset/
│   ├── config.json                # Changesets configuration
│   └── README.md                  # Version management guide
│
├── LICENSE                        # Apache 2.0 (applies to all SDKs)
├── .gitignore
└── README.md                      # This file
```

## 🛠️ Development

### Local Setup

```bash
cd checkout

# Install dependencies
npm install

# Development mode (watch TypeScript compilation)
npm run dev

# Build all formats
npm run build

# Build specific formats
npm run build:types    # TypeScript declarations
npm run build:esm      # ES modules for npm
npm run build:iife     # Standalone browser script
```

### Making Changes

1. **Create feature branch** from `dev` or `main`:
   ```bash
   git checkout -b feat/my-feature dev
   ```

2. **Make your changes** to the SDK

3. **Document the change** with a changeset:
   ```bash
   npx changeset add
   # Interactive prompt guides you through:
   # - Which package changed
   # - Bump type (major/minor/patch)
   # - Change description
   ```

4. **Commit and push**:
   ```bash
   git add .changeset/*.md checkout/
   git commit -m "feat: add new capability"
   git push origin feat/my-feature
   ```

5. **Open a pull request** on GitHub — CI runs automatically

### Development Branches

| Branch | Purpose | Auto-publishes |
|--------|---------|---|
| `main` | Production releases | ✅ Latest to npm + CDN |
| `dev` | Beta/pre-release testing | ✅ Beta versions to npm |
| `feat/*` | Feature branches | ❌ Only for CI verification |

## 📦 Releases & Versions

### Version Numbering

- **Production**: `1.0.0`, `1.1.0`, `2.0.0` (semantic versioning)
- **Beta**: `1.0.0-beta.1`, `1.0.0-beta.2` (on dev branch)

### Accessing Releases

```bash
# Latest production version
npm install @swiftpay/checkout-sdk

# Specific version
npm install @swiftpay/checkout-sdk@1.0.0

# Latest beta (pre-release)
npm install @swiftpay/checkout-sdk@beta

# Browser CDN (production)
<script src="https://cdn.swiftpay.finance/checkout@latest/index.iife.js"></script>

# Browser CDN (specific version)
<script src="https://cdn.swiftpay.finance/checkout@1.0.0/index.iife.js"></script>

# Browser CDN (beta)
<script src="https://cdn.swiftpay.finance/checkout@beta/index.iife.js"></script>
```

### Version Management

This project uses [Changesets](https://github.com/changesets/changesets) for automated version management. When you add a changeset, the version bump and changelog are generated automatically during release.

For detailed information, see [Changesets Guide](./.changeset/README.md).

## 🛠️ System Requirements

- **Node.js**: 20.0.0 or higher
- **npm**: 10.0.0 or higher

### Build Dependencies

- **TypeScript** (5.9+) — Type checking
- **esbuild** (0.21+) — Bundling and minification
- **Changesets** (2.31+) — Version management
- **React** (18+) — Peer dependency for React hook

## 🧪 Testing

### Manual Testing Checklist

- ✅ SDK initialization with different options
- ✅ Invoice creation and checkout flows
- ✅ All checkout modes (popup, iframe, redirect)
- ✅ Event emission and callbacks
- ✅ Error handling and edge cases
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- ✅ Mobile responsiveness

### Automated CI

Pull requests and pushes to `main`, `dev`, and `feat/*` branches automatically run:
- TypeScript type checking
- Bundle generation (ESM + IIFE)
- Package integrity verification

## 🔐 Security

### API Endpoints

| Environment | Endpoint |
|-------------|----------|
| **Production** | `https://api.swiftpay.finance` |
| **Sandbox** | `https://sandbox-api.swiftpay.finance` |

The SDK automatically selects the correct endpoint based on the `sandbox` option.

### Best Practices

- ✅ Use **publishable keys only** (`pk_*`) in client code
- ✅ Never commit or expose **secret keys** (`sk_*`)
- ✅ Always use **HTTPS** in production
- ✅ Validate **origin** in iframe integrations
- ✅ Keep SDKs **updated** for security patches
- ✅ Never log sensitive data (tokens, keys, card numbers)

## 📖 Documentation

- **[Checkout SDK Docs](./checkout/README.md)** — Complete API reference, examples, patterns
- **[Changesets Guide](./.changeset/README.md)** — How to version and release changes
- **[Product Spec](../docs/mvp-product-document.md)** — High-level product requirements

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. Review the [development](#-development) section above
2. Create a feature branch from `dev` or `main`
3. Make your changes and add a changeset
4. Submit a pull request with a clear description
5. Ensure CI passes and request review
6. Once approved, merge your PR

### Contribution Guidelines

- **Code style**: Follow existing patterns in the codebase
- **TypeScript**: Use strict type checking
- **Documentation**: Update README.md if adding public APIs
- **Testing**: Add manual test cases for new features
- **Commits**: Write clear, descriptive commit messages
- **Changesets**: Document all user-facing changes

## 📞 Support & Feedback

- **GitHub Issues**: [Report bugs and request features](https://github.com/theigwe/swiftpay-finance/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/theigwe/swiftpay-finance/discussions)
- **Email**: support@swiftpay.finance

## 📄 License

Licensed under the Apache License, Version 2.0.

**Summary:**
- ✅ Free to use, modify, and distribute
- ✅ Commercial use allowed
- ✅ Patent protection included
- ✅ Must include license and copyright notice
- ✅ No warranty or liability

**Copyright © 2026 SwiftPay Finance**

See [LICENSE](./LICENSE) for full details.

---

**Last Updated**: May 2026  
**Latest Release**: Check [releases page](https://github.com/theigwe/swiftpay-finance/releases)  
**API Version**: v1
