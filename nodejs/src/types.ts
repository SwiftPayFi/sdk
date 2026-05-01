// Hand-authored from mintlify-docs/openapi.json. Keep in sync when the spec
// changes — the test suite asserts URL/method/header shape but cannot detect
// schema drift on response bodies.

// ── Envelopes ────────────────────────────────────────────────────────────────

export interface ApiSuccess<T, M = unknown> {
  success: true;
  data: T;
  metadata?: M;
  message?: string;
}

export interface ApiErrorBody {
  success: false;
  error: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedMetadata {
  pagination: PaginationMeta;
}

// ── Utilities ────────────────────────────────────────────────────────────────

export interface ChainConfig {
  id: string;
  name: string;
  symbol: string;
  type: string;
  chainId: number;
  nativeCurrency: string;
  blockTimeSeconds: number;
  confirmationBlocks: number;
  explorerUrl: string;
  isTestnet: boolean;
}

export interface TokenNetworkConfig {
  address: string;
  decimals: number;
}

export interface TokenConfig {
  symbol: string;
  name: string;
  type: string;
  coingeckoId: string;
  networks: Record<string, TokenNetworkConfig>;
}

// ── Invoices ─────────────────────────────────────────────────────────────────

export interface TreasuryAddressResponse {
  chainType: string;
  address: string;
}

export interface InvoiceDepositAddress {
  networkId: string;
  networkName: string;
  networkSymbol: string;
  address: string;
}

export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'completed';

export interface InvoiceResponse {
  id: string;
  merchantId: string;
  externalRef: string;
  reference: string;
  addresses: InvoiceDepositAddress[];
  recipient: TreasuryAddressResponse | null;
  tokenAddress: string;
  tokenSymbol: string;
  targetNetwork: string;
  amountExpected: string;
  pendingAmount: string;
  receivedAmount: string;
  platformFee: string;
  amountRemitted: string;
  overpaidAmount: string;
  status: InvoiceStatus;
  expiresAt: string;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  transactions: TransactionResponse[];
}

export type TransactionStatus = 'detected' | 'confirmed' | 'failed';
export type TransactionType = 'payment' | 'forward';

export interface TransactionResponse {
  id: string;
  invoiceId: string;
  invoiceRef: string;
  merchantId: string;
  txHash: string;
  chain: string;
  asset: string;
  tokenAddress: string;
  amount: string;
  fee: string;
  merchantAmount: string;
  status: TransactionStatus;
  type: TransactionType;
  blockNumber: number;
  blockTimestamp: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface CreateInvoiceRequest {
  amount: string;
  token: string;
  network: string;
  recipients?: Record<string, string>;
  externalRef?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
}

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
}

export interface ListInvoicesResult {
  invoices: InvoiceResponse[];
  pagination: PaginationMeta;
}

export interface RescanInvoiceRequest {
  chain: string;
  txHash?: string;
  fromBlock?: number;
}

export interface RescanInvoiceResult {
  found: number;
}

// ── x402 facilitator ─────────────────────────────────────────────────────────

export interface PaymentRequirementsExtra {
  name?: string;
  version?: string;
  merchantId?: string;
  endpointId?: string;
  [key: string]: unknown;
}

export interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: PaymentRequirementsExtra;
  description?: string;
}

export interface FacilitatorRequest {
  x402Version: number;
  paymentPayload: string;
  paymentRequirements: PaymentRequirements;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

export interface SettlementResponse {
  success: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
  amount?: string;
  asset?: string;
  paymentId?: string;
  settledAt?: string | null;
  error?: string;
}

export interface SupportedKind {
  x402Version: number;
  scheme: string;
  network: string;
}

export interface SupportedResponse {
  kinds: SupportedKind[];
  extensions: string[];
  signers: Record<string, string[]>;
}

export type PaymentStatusValue = 'not_found' | 'pending' | 'settled' | 'failed';

export interface PaymentStatusResponse {
  nonce: string;
  status: PaymentStatusValue;
  paymentId?: string;
  transaction?: string;
  network?: string;
  payer?: string;
  amount?: string;
  settledAt?: string | null;
}

// ── x402 endpoints ───────────────────────────────────────────────────────────

export interface RegisterX402EndpointRequest {
  endpointUrl: string;
  description?: string;
  asset: string;
  network: string;
  amountUsd: number;
}

export interface X402EndpointResponse {
  id: string;
  merchantId: string;
  endpointUrl: string;
  description: string;
  asset: string;
  network: string;
  amountUsd: number;
  treasuryAddress: string;
  forwarderAddress: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterX402EndpointResult {
  endpoint: X402EndpointResponse;
  paymentRequirements: PaymentRequirements;
}

export interface RequirementsResponse {
  x402Version: number;
  requirements: PaymentRequirements;
}
