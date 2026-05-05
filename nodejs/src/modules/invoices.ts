import type { HTTPClient } from '../client.js';
import type {
  CreateInvoiceRequest,
  InvoiceResponse,
  ListInvoicesParams,
  ListInvoicesResult,
  PaginationMeta,
  RescanInvoiceRequest,
  RescanInvoiceResult,
  TransactionResponse,
} from '../types.js';

export interface CreateInvoiceResult {
  invoice: InvoiceResponse;
  /** True when the invoice was newly created (HTTP 201). False when an existing
   *  invoice was returned for the same `externalRef` (HTTP 200). */
  created: boolean;
}

interface ListInvoicesEnvelope {
  success: true;
  data: InvoiceResponse[];
  metadata?: { pagination?: PaginationMeta };
}

interface CreateInvoiceEnvelope {
  success: true;
  data: InvoiceResponse;
}

/**
 * Invoice management. Requires a secret API key.
 */
export class InvoicesModule {
  constructor(
    private readonly http: HTTPClient,
    private readonly requireSecretKey: (op: string) => void,
  ) {}

  /** POST /v1/invoices — create or idempotently return an existing invoice. */
  async create(body: CreateInvoiceRequest): Promise<CreateInvoiceResult> {
    this.requireSecretKey('invoices.create');
    const raw = await this.http.requestRaw<CreateInvoiceEnvelope | InvoiceResponse>({
      method: 'POST',
      path: '/v1/invoices',
      body,
    });
    const invoice = unwrapData(raw.body) as InvoiceResponse;
    return { invoice, created: raw.status === 201 };
  }

  /** GET /v1/invoices — paginated list of invoices for the authenticated merchant. */
  async list(params: ListInvoicesParams = {}): Promise<ListInvoicesResult> {
    this.requireSecretKey('invoices.list');
    const raw = await this.http.requestRaw<ListInvoicesEnvelope>({
      method: 'GET',
      path: '/v1/invoices',
      query: { page: params.page, limit: params.limit },
    });
    return {
      invoices: raw.body.data ?? [],
      pagination: raw.body.metadata?.pagination ?? {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  /** GET /v1/invoices/{id} — fetch a single invoice with its transactions. */
  async get(id: string): Promise<InvoiceResponse> {
    this.requireSecretKey('invoices.get');
    return this.http.request<InvoiceResponse>({
      method: 'GET',
      path: `/v1/invoices/${encodeURIComponent(id)}`,
    });
  }

  /** GET /v1/invoices/{id}/transactions — list every on-chain transaction tied to an invoice. */
  async listTransactions(id: string): Promise<TransactionResponse[]> {
    this.requireSecretKey('invoices.listTransactions');
    return this.http.request<TransactionResponse[]>({
      method: 'GET',
      path: `/v1/invoices/${encodeURIComponent(id)}/transactions`,
    });
  }

  /** POST /v1/invoices/{id}/rescan — replay a block range to recover missed transfers. */
  async rescan(id: string, body: RescanInvoiceRequest): Promise<RescanInvoiceResult> {
    this.requireSecretKey('invoices.rescan');
    return this.http.request<RescanInvoiceResult>({
      method: 'POST',
      path: `/v1/invoices/${encodeURIComponent(id)}/rescan`,
      body,
    });
  }
}

function unwrapData(body: unknown): unknown {
  if (body && typeof body === 'object') {
    const obj = body as { success?: boolean; data?: unknown };
    if (obj.success === true && 'data' in obj) return obj.data;
  }
  return body;
}
