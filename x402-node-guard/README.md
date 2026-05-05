# @swiftpayfi/x402-node-guard

x402 payment middleware for Express and Fastify — powered by the SwiftPay API.

## Installation

```bash
npm install @swiftpayfi/x402-node-guard @swiftpayfi/api-client
```

## Express

```typescript
import { SwiftPay } from '@swiftpayfi/api-client';
import { x402Express } from '@swiftpayfi/x402-node-guard/express';

const client = new SwiftPay({ secretKey: process.env.SWIFTPAY_SECRET_KEY });
const x402 = x402Express({ client });

app.get('/v1/analyze', x402('https://api.example.com/v1/analyze'), (req, res) => {
  res.json({ sentiment: 'positive', score: 0.87 });
});
```

## Fastify

```typescript
import { SwiftPay } from '@swiftpayfi/api-client';
import { x402Fastify } from '@swiftpayfi/x402-node-guard/fastify';

const client = new SwiftPay({ secretKey: process.env.SWIFTPAY_SECRET_KEY });
const x402 = x402Fastify({ client });

fastify.get(
  '/v1/analyze',
  { preHandler: x402('https://api.example.com/v1/analyze') },
  async () => ({ sentiment: 'positive', score: 0.87 }),
);
```

## How it works

The guard implements the two-round x402 payment flow:

1. **No `X-PAYMENT` header** — returns HTTP 402 with payment requirements
2. **With `X-PAYMENT` header** — calls SwiftPay to settle, then serves the resource

Your server never touches private keys. SwiftPay verifies the EIP-712 signature and executes the on-chain USDC settlement.
