import 'dotenv/config';
import express from 'express';
import { SwiftPay } from '@swiftpayfi/api-client';
import { x402Express } from '@swiftpayfi/x402-node-guard/express';

// ─── Config ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 9999;
const SECRET_KEY = process.env.SWIFTPAY_SECRET_KEY;
const API_BASE_URL = process.env.SWIFTPAY_BASE_URL;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

if (!SECRET_KEY) {
  console.error('Missing SWIFTPAY_SECRET_KEY — copy .env.example to .env and add your key.');
  process.exit(1);
}

// ─── SwiftPay Client ───────────────────────────────────────────────────────────

const swiftpay = new SwiftPay({ secretKey: SECRET_KEY, baseUrl: API_BASE_URL });

// ─── x402 Guard ────────────────────────────────────────────────────────────────
// Creates a middleware factory. Pass a URL or endpoint ID to protect a route.

const x402 = x402Express({ client: swiftpay });

// ─── App ───────────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ─── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── Invoice Endpoints ─────────────────────────────────────────────────────────
// Traditional invoice-based payment: create an invoice, get a deposit address,
// wait for payment, receive a webhook.

app.post('/invoices', async (req, res, next) => {
  try {
    const { amount, token = 'USDC', network = 'base', externalRef, metadata } = req.body;

    const invoice = await swiftpay.invoices.create({
      amount: String(amount),
      token,
      network,
      externalRef,
      metadata,
    });

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

app.get('/invoices/:id', async (req, res, next) => {
  try {
    const invoice = await swiftpay.invoices.get(req.params.id);
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

// ─── x402-Protected Endpoints ──────────────────────────────────────────────────
// Per-request payment via HTTP 402. No checkout flow — the caller pays per call.
//
// Before using these, register the endpoint with SwiftPay:
//   POST /v1/x402/endpoints
//   { "endpointUrl": "http://localhost:3000/v1/sentiment", "asset": "USDC",
//     "network": "eip155:8453", "amountUsd": 0.01 }
//
// Then callers interact with your API directly. The guard handles the 402 flow.

app.get(
  '/v1/sentiment',
  x402(`${SERVER_URL}/v1/sentiment`),
  (_req, res) => {
    res.json({
      sentiment: 'positive',
      score: 0.87,
      tokens: 142,
    });
  },
);

app.get(
  '/v1/translate',
  x402(`${SERVER_URL}/v1/translate`),
  (req, res) => {
    const text = req.query.text as string || 'Hello, world!';
    res.json({
      original: text,
      translated: 'Hola, mundo!',
      source: 'en',
      target: 'es',
    });
  },
);

// ─── Webhook Receiver ──────────────────────────────────────────────────────────
// SwiftPay sends signed webhooks for payment lifecycle events.

app.post('/webhooks/swiftpay', (req, res) => {
  const event = req.body;

  console.log(`[webhook] ${event.event}`, {
    invoiceId: event.invoice_id,
    amount: event.amount,
    txHash: event.tx_hash,
  });

  // Acknowledge receipt
  res.status(200).json({ received: true });
});

// ─── Error Handler ─────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message });
});

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  SwiftPay Express Example`);
  console.log(`  ─────────────────────────`);
  console.log(`  Server:     ${SERVER_URL}`);
  console.log(`  Health:     GET  /health`);
  console.log(`  Invoices:   POST /invoices`);
  console.log(`  x402:       GET  /v1/sentiment   ($0.01/call)`);
  console.log(`  x402:       GET  /v1/translate   ($0.01/call)`);
  console.log(`  Webhooks:   POST /webhooks/swiftpay\n`);
});
