import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { ethers } from 'ethers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(label: string, ...args: unknown[]) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${label}]`, ...args);
}

function logError(label: string, ...args: unknown[]) {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [${label}]`, ...args);
}

function logSection(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(60)}\n`);
}

// ─── EIP-712 Types for EIP-3009 TransferWithAuthorization ─────────────────────

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:9999';
const endpointPath = process.argv[2];

if (!PRIVATE_KEY) {
  logError('CONFIG', 'Missing PRIVATE_KEY environment variable.');
  logError('CONFIG', 'Set it in your .env file: PRIVATE_KEY=0x...');
  process.exit(1);
}

if (!endpointPath) {
  logError('USAGE', 'Missing endpoint path argument.');
  logError('USAGE', 'Usage: npx tsx src/test-x402-payment.ts /v1/sentiment');
  logError('USAGE', '       npx tsx src/test-x402-payment.ts /v1/translate');
  process.exit(1);
}

const targetUrl = `${SERVER_URL.replace(/\/$/, '')}${endpointPath}`;

// ─── Main ─────────────────────────────────────────────────────────────────────

interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: {
    name?: string;
    version?: string;
    merchantId?: string;
    endpointId?: string;
    [key: string]: unknown;
  };
  description?: string;
}

interface X402Response {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}

async function main() {
  logSection('x402 Payment Test');

  const wallet = new ethers.Wallet(PRIVATE_KEY!);
  log('WALLET', `Address: ${wallet.address}`);
  log('TARGET', `Endpoint: ${targetUrl}`);

  // ── Step 1: Initial request (expect 402) ──────────────────────────────────

  logSection('Step 1: Initial Request (expecting 402)');

  let initialResponse: Response;
  try {
    initialResponse = await fetch(targetUrl);
  } catch (err: any) {
    logError('NETWORK', `Failed to reach ${targetUrl}`);
    logError('NETWORK', `Error: ${err.message}`);
    logError('NETWORK', 'Is the server running? Try: npm run dev');
    process.exit(1);
  }

  log('RESPONSE', `Status: ${initialResponse.status} ${initialResponse.statusText}`);

  if (initialResponse.status !== 402) {
    const body = await initialResponse.text();
    logError('UNEXPECTED', `Expected 402 Payment Required, got ${initialResponse.status}`);
    logError('UNEXPECTED', `Body: ${body}`);
    logError('UNEXPECTED', 'Is this an x402-protected endpoint? Is the endpoint registered?');
    process.exit(1);
  }

  const x402Body: X402Response = await initialResponse.json();
  log('402 BODY', JSON.stringify(x402Body, null, 2));

  if (!x402Body.accepts || x402Body.accepts.length === 0) {
    logError('PROTOCOL', 'No payment options in 402 response (accepts array is empty).');
    process.exit(1);
  }

  // ── Step 2: Parse payment requirements ────────────────────────────────────

  logSection('Step 2: Parse Payment Requirements');

  const requirements = x402Body.accepts[0];
  log('REQUIREMENTS', `Scheme:     ${requirements.scheme}`);
  log('REQUIREMENTS', `Network:    ${requirements.network}`);
  log('REQUIREMENTS', `Amount:     ${requirements.amount} (smallest unit)`);
  log('REQUIREMENTS', `Asset:      ${requirements.asset}`);
  log('REQUIREMENTS', `Pay To:     ${requirements.payTo}`);
  log('REQUIREMENTS', `Timeout:    ${requirements.maxTimeoutSeconds}s`);
  if (requirements.extra) {
    log('REQUIREMENTS', `Extra:      ${JSON.stringify(requirements.extra)}`);
  }

  // ── Step 3: Build EIP-712 domain and message ──────────────────────────────

  logSection('Step 3: Build EIP-712 Typed Data');

  const networkParts = requirements.network.split(':');
  const chainId = parseInt(networkParts[networkParts.length - 1], 10);

  if (isNaN(chainId)) {
    logError('PROTOCOL', `Cannot parse chainId from network: "${requirements.network}"`);
    process.exit(1);
  }

  const domain: ethers.TypedDataDomain = {
    name: requirements.extra?.name || 'USD Coin',
    version: requirements.extra?.version || '2',
    chainId,
    verifyingContract: requirements.asset,
  };

  const nonce = '0x' + randomBytes(32).toString('hex');
  const validAfter = '0';
  const validBefore = String(Math.floor(Date.now() / 1000) + requirements.maxTimeoutSeconds);

  const message = {
    from: wallet.address,
    to: requirements.payTo,
    value: requirements.amount,
    validAfter,
    validBefore,
    nonce,
  };

  log('DOMAIN', JSON.stringify(domain, null, 2));
  log('MESSAGE', JSON.stringify(message, null, 2));

  // ── Step 4: Sign EIP-712 typed data ───────────────────────────────────────

  logSection('Step 4: Sign Payment Authorization');

  let signature: string;
  try {
    signature = await wallet.signTypedData(
      domain,
      TRANSFER_WITH_AUTHORIZATION_TYPES,
      message,
    );
    log('SIGNATURE', signature);
  } catch (err: any) {
    logError('SIGNING', `Failed to sign typed data: ${err.message}`);
    logError('SIGNING', err.stack);
    process.exit(1);
  }

  // ── Step 5: Build and encode payment payload ──────────────────────────────

  logSection('Step 5: Encode Payment Payload');

  const paymentPayload = {
    x402Version: x402Body.x402Version,
    accepted: requirements,
    payload: {
      signature,
      authorization: message,
    },
  };

  log('PAYLOAD', JSON.stringify(paymentPayload, null, 2));

  const encodedPayload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  log('ENCODED', `${encodedPayload.substring(0, 80)}... (${encodedPayload.length} chars)`);

  // ── Step 6: Resend request with x-payment header ──────────────────────────

  logSection('Step 6: Resend with Payment Header');

  let paidResponse: Response;
  try {
    paidResponse = await fetch(targetUrl, {
      headers: {
        'x-payment': encodedPayload,
      },
    });
  } catch (err: any) {
    logError('NETWORK', `Failed to resend request: ${err.message}`);
    process.exit(1);
  }

  log('RESPONSE', `Status: ${paidResponse.status} ${paidResponse.statusText}`);

  // Log response headers
  const paymentResponse = paidResponse.headers.get('x-payment-response');
  if (paymentResponse) {
    log('HEADER', `X-Payment-Response: ${paymentResponse}`);
    try {
      const parsed = JSON.parse(paymentResponse);
      log('SETTLEMENT', JSON.stringify(parsed, null, 2));
    } catch {
      log('SETTLEMENT', paymentResponse);
    }
  }

  // Log response body
  const responseBody = await paidResponse.text();
  try {
    const parsed = JSON.parse(responseBody);
    log('BODY', JSON.stringify(parsed, null, 2));
  } catch {
    log('BODY', responseBody);
  }

  // ── Result ────────────────────────────────────────────────────────────────

  logSection('Result');

  if (paidResponse.status === 200) {
    log('SUCCESS', 'Payment accepted! Endpoint returned 200 OK.');
  } else if (paidResponse.status === 402) {
    logError('REJECTED', 'Payment was rejected. The facilitator could not settle.');
    logError('REJECTED', 'Common causes:');
    logError('REJECTED', '  - Wallet has insufficient USDC balance on target chain');
    logError('REJECTED', '  - USDC transferWithAuthorization not approved');
    logError('REJECTED', '  - Signature or payload format mismatch');
    process.exit(1);
  } else {
    logError('UNEXPECTED', `Unexpected status ${paidResponse.status} after payment.`);
    process.exit(1);
  }
}

main().catch((err) => {
  logError('FATAL', `Unhandled error: ${err.message}`);
  logError('FATAL', err.stack);
  process.exit(1);
});
