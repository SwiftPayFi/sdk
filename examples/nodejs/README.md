# Express Backend Example

A minimal Express server demonstrating the SwiftPay API client and x402 payment guard.

## What's included

| Route | Description |
|---|---|
| `POST /invoices` | Create a payment invoice (traditional flow) |
| `GET /invoices/:id` | Check invoice status |
| `GET /v1/sentiment` | x402-protected endpoint ($0.01/call) |
| `GET /v1/translate` | x402-protected endpoint ($0.01/call) |
| `POST /webhooks/swiftpay` | Webhook receiver |

## Setup

```bash
# 1. Build the local SDKs
cd ../../nodejs && npm install && npm run build
cd ../x402-node-guard && npm install && npm run build

# 2. Install example deps
cd ../examples/express
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your secret key from https://cockpit.swiftpay.finance

# 4. Run
npm run dev
```

## Register x402 endpoints

Before the x402 guard can work, register your protected routes with SwiftPay:

```bash
curl -X POST https://api.swiftpay.finance/v1/x402/endpoints \
  -H "X-Swift-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "endpointUrl": "http://localhost:3000/v1/sentiment",
    "asset": "USDC",
    "network": "eip155:8453",
    "amountUsd": 0.01
  }'
```

## How x402 works

```
Client                          Your Server                     SwiftPay
  │                                │                                │
  │─── GET /v1/sentiment ─────────►│                                │
  │                                │── fetch requirements ─────────►│
  │◄── 402 + payment requirements ─│◄─────────────────────────────  │
  │                                │                                │
  │ (client signs USDC transfer)   │                                │
  │                                │                                │
  │─── GET /v1/sentiment ─────────►│                                │
  │    + X-PAYMENT header          │── settle ─────────────────────►│
  │                                │◄── success ───────────────────  │
  │◄── 200 + response ────────────  │                                │
```

## Targeting by endpoint ID

Instead of the full URL, you can target by the endpoint ID returned during registration:

```typescript
// By URL (auto-detected)
x402('https://api.example.com/v1/sentiment')

// By endpoint ID (auto-detected)
x402('ep_abc123')
```
