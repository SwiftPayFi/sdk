export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'completed';

type ISO8601DateString = string;

export interface CheckoutInvoiceAddress {
  networkId: string;
  networkName: string;
  networkSymbol: string;
  address: string;
}

export interface CheckoutInvoice {
  id: string;
  merchantId: string;
  externalRef: string | null;
  reference: string;
  addresses: CheckoutInvoiceAddress[];
  tokenSymbol: string;
  amountExpected: string | null;
  pendingAmount: string | null;
  status: InvoiceStatus;
  metadata?: Record<string, unknown>;
  expiresAt: ISO8601DateString | null;
  createdAt: ISO8601DateString;
}

export interface MerchantBranding {
  brandName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  themeMode: 'light' | 'dark' | 'auto';
  supportEmail: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  allowedCallbackHosts: string[];
  createdAt: ISO8601DateString;
  updatedAt: ISO8601DateString;
}

export interface CheckoutSessionResponse {
  sessionToken: string;
  checkout: Record<string, unknown>;
  checkoutUrl: string;
  /** Origin captured at session creation. Required by the backend's session-origin guard. */
  sessionOrigin?: string | null;
  /** Validated callback URL the hosted page may redirect to on completion. */
  callbackUrl?: string | null;
  /** Token used to authenticate postMessage payloads from the hosted checkout iframe. */
  postMessageToken: string;
  /** Merchant branding snapshot for the hosted checkout. */
  branding?: MerchantBranding | null;
  expiresAt: ISO8601DateString | null;
  createdAt: ISO8601DateString;
  invoice: CheckoutInvoice;
}

export interface CheckoutCreateBody {
  token: string;
  amount: number;
  chains?: string[];
  externalRef?: string;
  expiresAt?: ISO8601DateString;
  metadata?: Record<string, unknown>;
  checkout?: Record<string, unknown>;
  recipient?: string;
}

export type CheckoutMode = 'popup' | 'iframe' | 'redirect';

export interface CheckoutPopupOptions {
  width?: number;
  height?: number;
  features?: string;
}

export interface CheckoutIframeOptions {
  container?: string | HTMLElement;
  width?: number | string;
  height?: number | string;
  title?: string;
}

export type CheckoutCloseReason = 'completed' | 'manual' | 'user_closed' | 'error' | 'expired' | 'destroyed' | 'redirect';

export interface CheckoutClosePayload {
  reason: CheckoutCloseReason;
  session?: CheckoutSessionResponse;
}

export interface CreateInvoiceOptions {
  amount: number;
  token?: string;
  reference?: string;
  chains?: string[];
  metadata?: Record<string, unknown>;
  expiresAt?: Date | string;
  recipient?: string;
}

export interface SwiftPayCheckoutOptions {
  /** Publishable key from dashboard */
  key: string;

  /** Default asset and chain (can be overridden per invoice in createInvoice) */
  token?: string;
  chains?: string[];
  checkout?: Record<string, unknown>;

  /** SDK-specific behaviour */
  mode?: CheckoutMode;
  sandbox?: boolean;
  callbackUrl?: string;
  autoClose?: boolean;
  pollIntervalMs?: number;

  /** Popup options */
  popup?: CheckoutPopupOptions;

  /** Iframe options */
  iframe?: CheckoutIframeOptions;

  /** Event and callback handlers */
  onLoad?: (payload: { session: CheckoutSessionResponse }) => void;
  onOpen?: (payload: { mode: CheckoutMode; checkoutUrl: string; session: CheckoutSessionResponse }) => void;
  onClose?: (payload: { reason: CheckoutCloseReason; session?: CheckoutSessionResponse }) => void;
  onCancel?: (payload: CheckoutClosePayload) => void;
  onSuccess?: (payload: { invoice: CheckoutInvoice; session: CheckoutSessionResponse }) => void;
  onError?: (error: CheckoutSDKError) => void;
  onStatusChange?: (payload: {
    status: InvoiceStatus;
    previousStatus?: InvoiceStatus;
    invoice: CheckoutInvoice;
    session: CheckoutSessionResponse;
  }) => void;
}

export type CheckoutEvent =
  | 'ready'
  | 'open'
  | 'close'
  | 'cancel'
  | 'error'
  | 'status'
  | 'payment.pending'
  | 'payment.partial'
  | 'payment.paid'
  | 'payment.completed'
  | 'redirect'
  | 'expired';

interface CheckoutSuccessEvent {
  invoice: CheckoutInvoice;
  session: CheckoutSessionResponse;
}

interface CheckoutOpenPayload {
  mode: CheckoutMode;
  checkoutUrl: string;
  session: CheckoutSessionResponse;
}

interface CheckoutStatusPayload {
  status: InvoiceStatus;
  previousStatus?: InvoiceStatus;
  invoice: CheckoutInvoice;
  session: CheckoutSessionResponse;
}

interface CheckoutErrorPayload {
  error: CheckoutSDKError;
}

interface CheckoutRedirectPayload {
  url: string;
  session: CheckoutSessionResponse;
}

interface CheckoutExpiredPayload {
  sessionToken: string;
  session?: CheckoutSessionResponse;
}

type CheckoutEventPayloadMap = {
  ready: { session: CheckoutSessionResponse };
  open: CheckoutOpenPayload;
  close: CheckoutClosePayload;
  cancel: CheckoutClosePayload;
  error: CheckoutErrorPayload;
  status: CheckoutStatusPayload;
  'payment.pending': CheckoutSuccessEvent;
  'payment.partial': CheckoutSuccessEvent;
  'payment.paid': CheckoutSuccessEvent;
  'payment.completed': CheckoutSuccessEvent;
  redirect: CheckoutRedirectPayload;
  expired: CheckoutExpiredPayload;
};

type CheckoutEventHandler<EventName extends CheckoutEvent> = (payload: CheckoutEventPayloadMap[EventName]) => void;

type CheckoutAPIResponse<T> = {
  success: true;
  data: T;
};

const DEFAULT_POLL_INTERVAL_MS = 4_000;
const DEFAULT_POPUP_WIDTH = 520;
const DEFAULT_POPUP_HEIGHT = 740;

const getApiBaseUrl = (sandbox: boolean): string => {
  return sandbox ? 'https://sandbox-api.swiftpay.finance' : 'https://api.swiftpay.finance';
};

const eventNameForStatus: Record<Exclude<InvoiceStatus, 'completed'>, CheckoutEvent> = {
  pending: 'payment.pending',
  partial: 'payment.partial',
  paid: 'payment.paid',
};

class CheckoutSDKError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CheckoutSDKError';
    this.code = code;
  }
}

class SwiftPayOriginError extends CheckoutSDKError {
  constructor(message: string = 'Origin not permitted by SwiftPay') {
    super(message, 'origin_forbidden');
    this.name = 'SwiftPayOriginError';
  }
}

export { CheckoutSDKError, SwiftPayOriginError };

// ── SSE subscription helper ──────────────────────────────────────────────────

export interface CheckoutEventEnvelope {
  type: string;
  data?: unknown;
}

export interface SubscribeSessionEventsOptions {
  apiBaseUrl?: string;
  onEvent?: (event: CheckoutEventEnvelope) => void;
  onOpen?: () => void;
  onError?: (event: Event) => void;
}

export interface SessionEventSubscription {
  close: () => void;
  readonly readyState: number;
}

/**
 * Subscribe to a checkout session's SSE event stream. Validates the session
 * origin against the current document so the caller can detect cross-origin
 * misuse early. The browser will already send the Origin header that the
 * backend's SessionOriginGuard checks.
 */
export const subscribeSessionEvents = (
  sessionToken: string,
  options: SubscribeSessionEventsOptions = {}
): SessionEventSubscription => {
  if (typeof EventSource === 'undefined') {
    throw new CheckoutSDKError('EventSource is not available in this environment', 'no_eventsource');
  }
  if (!sessionToken) {
    throw new CheckoutSDKError('sessionToken is required', 'invalid_options');
  }
  const baseUrl = options.apiBaseUrl ?? getApiBaseUrl(false);
  const url = `${baseUrl}/v1/checkout/sessions/${encodeURIComponent(sessionToken)}/events`;
  const source = new EventSource(url, { withCredentials: false });

  if (options.onOpen) {
    source.addEventListener('open', options.onOpen);
  }
  if (options.onError) {
    source.addEventListener('error', options.onError);
  }
  if (options.onEvent) {
    source.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as CheckoutEventEnvelope;
        options.onEvent?.(parsed);
      } catch {
        // ignore non-JSON heartbeats
      }
    });
  }

  return {
    close: () => source.close(),
    get readyState() {
      return source.readyState;
    },
  };
};

export class SwiftPayCheckout {
  private readonly options: Required<
    Pick<
      SwiftPayCheckoutOptions,
      'mode' | 'autoClose' | 'pollIntervalMs' | 'key'
    >
  > &
    Omit<SwiftPayCheckoutOptions, 'mode' | 'autoClose' | 'pollIntervalMs' | 'key'>;
  private readonly apiBaseUrl: string;
  private session: CheckoutSessionResponse | null = null;
  private currentStatus: InvoiceStatus | null = null;
  private completed = false;
  private pollTimer: number | null = null;
  private popupPollTimer: number | null = null;
  private isProcessing = false;
  private isOpen = false;
  private destroyed = false;
  private iframeElement: HTMLIFrameElement | null = null;
  private iframeContainer: HTMLDivElement | null = null;
  private popupWindow: Window | null = null;
  private eventSource: SessionEventSubscription | null = null;
  private postMessageHandler: ((event: MessageEvent) => void) | null = null;
  private listeners = new Map<CheckoutEvent, Set<(payload: unknown) => void>>();

  constructor(options: SwiftPayCheckoutOptions) {
    this.options = {
      autoClose: true,
      pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      mode: 'popup',
      ...options,
    } as typeof this.options;

    this.apiBaseUrl = getApiBaseUrl(this.options.sandbox ?? false);
    this.assertValidOptions(this.options);
  }

  public on<EventName extends CheckoutEvent>(
    event: EventName,
    handler: CheckoutEventHandler<EventName>
  ): () => void {
    const current = this.listeners.get(event) ?? new Set<(payload: unknown) => void>();
    current.add(handler as (payload: unknown) => void);
    this.listeners.set(event, current);

    return () => this.off(event, handler);
  }

  public off<EventName extends CheckoutEvent>(
    event: EventName,
    handler: CheckoutEventHandler<EventName>
  ): void {
    const current = this.listeners.get(event);
    if (!current) return;

    current.delete(handler as (payload: unknown) => void);

    if (current.size === 0) {
      this.listeners.delete(event);
    }
  }

  public async createInvoice(invoiceOptions: CreateInvoiceOptions): Promise<CheckoutSessionResponse> {
    this.ensureBrowserEnvironment();

    if (this.destroyed) {
      throw new CheckoutSDKError('Cannot create invoice on a destroyed checkout instance', 'instance_destroyed');
    }

    if (!Number.isFinite(invoiceOptions.amount)) {
      throw new CheckoutSDKError('Amount must be a finite number', 'invalid_options');
    }

    if (invoiceOptions.amount <= 0) {
      throw new CheckoutSDKError('Amount must be greater than zero', 'invalid_options');
    }

    const token = invoiceOptions.token ?? this.options.token;
    if (!token || token.trim() === '') {
      throw new CheckoutSDKError('Token is required (token)', 'invalid_options');
    }

    this.resetForOpen();

    const body: CheckoutCreateBody = {
      token,
      amount: invoiceOptions.amount,
    };

    if (invoiceOptions.reference) {
      body.externalRef = invoiceOptions.reference;
    }

    if (invoiceOptions.chains?.length) {
      body.chains = invoiceOptions.chains;
    } else if (this.options.chains?.length) {
      body.chains = this.options.chains;
    }

    if (invoiceOptions.recipient) {
      body.recipient = invoiceOptions.recipient;
    }

    if (invoiceOptions.metadata) {
      body.metadata = invoiceOptions.metadata;
    }

    const checkoutConfig: Record<string, unknown> = {
      ...(this.options.checkout ?? {}),
      sandbox: this.options.sandbox ?? false,
    };

    if (this.options.callbackUrl) {
      checkoutConfig.callbackUrl = this.options.callbackUrl;
    } else if (
      this.options.callbackUrl === undefined &&
      typeof window !== 'undefined' &&
      window.location?.href
    ) {
      checkoutConfig.callbackUrl = window.location.href;
    }

    const hasCheckoutConfig = Object.keys(checkoutConfig).length > 0;
    if (hasCheckoutConfig) {
      body.checkout = checkoutConfig;
    }

    if (invoiceOptions.expiresAt) {
      const expiresAt =
        invoiceOptions.expiresAt instanceof Date
          ? invoiceOptions.expiresAt
          : new Date(invoiceOptions.expiresAt);

      if (Number.isNaN(expiresAt.getTime())) {
        throw new CheckoutSDKError('expiresAt must be a valid date', 'invalid_options');
      }

      body.expiresAt = expiresAt.toISOString();
    }

    try {
      const session = await this.request<CheckoutSessionResponse>('/checkout/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      this.session = session;
      this.currentStatus = session.invoice.status;

      return session;
    } catch (error) {
      this.emitError(error);
      throw error;
    }
  }

  public async open(openOptions?: { mode?: CheckoutMode }): Promise<CheckoutSessionResponse> {
    this.ensureBrowserEnvironment();

    if (this.destroyed) {
      throw new CheckoutSDKError('Cannot open a destroyed checkout instance', 'instance_destroyed');
    }

    if (!this.session) {
      throw new CheckoutSDKError('Call createInvoice() before open()', 'no_session');
    }

    if (this.isOpen || this.isProcessing) {
      return this.session;
    }

    this.isProcessing = true;

    try {
      const session = this.session;
      this.currentStatus = session.invoice.status;

      this.emit('ready', { session });
      this.options.onLoad?.({ session });

      const checkoutUrl = this.buildCheckoutURL(session.checkoutUrl);
      const mode = openOptions?.mode ?? this.options.mode;
      this.isOpen = true;

      if (mode === 'redirect') {
        this.emit('redirect', { url: checkoutUrl, session });
        this.options.onOpen?.({ mode, checkoutUrl, session });
        this.options.onStatusChange?.({
          status: session.invoice.status,
          invoice: session.invoice,
          session,
        });
        window.location.assign(checkoutUrl);
        this.close('redirect');
        return session;
      }

      if (mode === 'iframe') {
        this.createIframe(checkoutUrl);
      } else {
        this.openPopup(checkoutUrl);
      }

      this.emit('open', { mode, checkoutUrl, session });
      this.options.onOpen?.({ mode, checkoutUrl, session });
      this.startPolling(session.sessionToken);

      return session;
    } catch (error) {
      const normalizedError = this.emitError(error);
      this.close('error');
      throw normalizedError;
    } finally {
      this.isProcessing = false;
    }
  }

  public close(reason: CheckoutCloseReason = 'manual'): void {
    const session = this.session ?? undefined;
    this.cleanupOpen();
    this.emit('close', { reason, session });
    this.options.onClose?.({ reason, session });

    if (
      this.session &&
      (reason === 'user_closed' || reason === 'manual' || reason === 'error' || reason === 'expired')
    ) {
      const cancelPayload: CheckoutClosePayload = { reason, session: this.session };
      this.emit('cancel', cancelPayload);
      this.options.onCancel?.(cancelPayload);
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.cleanupOpen();
    this.listeners.clear();
  }

  public get sessionToken(): string | null {
    return this.session?.sessionToken ?? null;
  }

  public getSession(): CheckoutSessionResponse | null {
    return this.session;
  }

  public getBranding(): MerchantBranding | null {
    return this.session?.branding ?? null;
  }

  public getIframeElement(): HTMLIFrameElement | null {
    return this.iframeElement;
  }

  private assertValidOptions(options: Readonly<SwiftPayCheckoutOptions>): void {
    if (!options.key || options.key.trim() === '') {
      throw new CheckoutSDKError('Publishable key is required (key)', 'invalid_options');
    }

    if (options.mode !== 'iframe' && options.iframe) {
      throw new CheckoutSDKError('Iframe options are only valid in iframe mode', 'invalid_options');
    }

    if (options.pollIntervalMs && (options.pollIntervalMs <= 0 || options.pollIntervalMs > 60_000)) {
      throw new CheckoutSDKError('pollIntervalMs must be between 1 and 60000', 'invalid_options');
    }
  }

  private emit<EventName extends CheckoutEvent>(
    event: EventName,
    payload: CheckoutEventPayloadMap[EventName]
  ): void {
    const handlerSet = this.listeners.get(event);
    if (!handlerSet || handlerSet.size === 0) {
      return;
    }

    for (const handler of handlerSet) {
      try {
        (handler as CheckoutEventHandler<EventName>)(payload);
      } catch {
        // ignore listener errors so one listener can't break event flow
      }
    }
  }

  private emitError(error: unknown): CheckoutSDKError {
    const normalized =
      error instanceof CheckoutSDKError
        ? error
        : new CheckoutSDKError(
            error instanceof Error ? error.message : 'Checkout failed',
            'unexpected_error'
          );
    this.emit('error', { error: normalized });
    this.options.onError?.(normalized);
    return normalized;
  }

  private async fetchSession(sessionToken: string): Promise<CheckoutSessionResponse> {
    return this.request<CheckoutSessionResponse>(`/checkout/sessions/${sessionToken}`, {
      method: 'GET',
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Swift-Key': this.options.key,
      },
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      const message = `${response.status} ${response.statusText}`;
      if (response.status === 403) {
        throw new SwiftPayOriginError(message);
      }
      throw new CheckoutSDKError(message, `http_${response.status}`);
    }

    const responseBody = (await response.json()) as CheckoutAPIResponse<T>;

    if (!responseBody.success) {
      throw new CheckoutSDKError('Checkout request failed', 'request_failed');
    }

    return responseBody.data;
  }

  private buildCheckoutURL(checkoutUrl: string): string {
    if (!this.options.callbackUrl) {
      return checkoutUrl;
    }

    if (this.options.mode === 'redirect') {
      const next = new URL(checkoutUrl);
      next.searchParams.set('callback', this.options.callbackUrl);
      return next.toString();
    }

    return checkoutUrl;
  }

  private createPopupFeatures(width: number, height: number): string {
    const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - height) / 2));

    return `width=${width},height=${height},top=${top},left=${left},toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1`;
  }

  private openPopup(checkoutUrl: string): void {
    if (!window) {
      throw new CheckoutSDKError('Browser window object is unavailable', 'no_window');
    }

    const width = this.options.popup?.width ?? DEFAULT_POPUP_WIDTH;
    const height = this.options.popup?.height ?? DEFAULT_POPUP_HEIGHT;
    const features = this.options.popup?.features ?? this.createPopupFeatures(width, height);

    const popup = window.open('about:blank', 'swiftpay-checkout', features);
    if (!popup) {
      throw new CheckoutSDKError('Popup blocked by browser', 'popup_blocked');
    }

    popup.location.href = checkoutUrl;
    this.popupWindow = popup;

    this.popupPollTimer = window.setInterval(() => {
      if (!this.popupWindow || this.popupWindow.closed) {
        this.close('user_closed');
      }
    }, 500);
  }

  private createIframe(checkoutUrl: string): void {
    if (!document) {
      throw new CheckoutSDKError('Document is unavailable', 'no_document');
    }

    const container = this.resolveContainer(this.options.iframe?.container);
    const width = this.options.iframe?.width ?? 520;
    const height = this.options.iframe?.height ?? 720;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '2147483647';

    const frame = document.createElement('iframe');
    frame.src = checkoutUrl;
    frame.title = this.options.iframe?.title ?? 'SwiftPay checkout';
    frame.style.width = typeof width === 'number' ? `${width}px` : String(width);
    frame.style.height = typeof height === 'number' ? `${height}px` : String(height);
    frame.style.border = '0';
    frame.style.borderRadius = '12px';
    frame.style.background = 'white';
    frame.allow = 'clipboard-write';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '16px';
    closeButton.style.right = '16px';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.lineHeight = '24px';
    closeButton.style.padding = '4px 8px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.borderRadius = '999px';
    closeButton.style.background = 'rgba(255, 255, 255, 0.14)';
    closeButton.style.color = '#fff';

    closeButton.addEventListener('click', () => this.close('manual'));

    const frameWrap = document.createElement('div');
    frameWrap.style.position = 'relative';
    frameWrap.appendChild(closeButton);
    frameWrap.appendChild(frame);

    overlay.appendChild(frameWrap);

    container.style.position = container.style.position || 'relative';
    container.appendChild(overlay);

    this.iframeContainer = overlay;
    this.iframeElement = frame;
  }

  private resolveContainer(container?: string | HTMLElement): HTMLElement {
    if (!container) {
      return document.body;
    }

    if (typeof container === 'string') {
      const target = document.querySelector<HTMLElement>(container);
      if (!target) {
        throw new CheckoutSDKError(`Checkout container not found: ${container}`, 'invalid_container');
      }

      return target;
    }

    return container;
  }

  private startPolling(sessionToken: string): void {
    // Prefer SSE when available; fall back to polling.
    if (typeof EventSource !== 'undefined') {
      try {
        this.eventSource = subscribeSessionEvents(sessionToken, {
          apiBaseUrl: this.apiBaseUrl,
          onEvent: () => {
            // On any lifecycle event, refresh authoritative session state.
            void this.syncSession(sessionToken);
          },
          onError: () => {
            // EventSource auto-reconnects; if it closes permanently we'll
            // still see updates from the on-status poll below.
          },
        });
      } catch {
        this.eventSource = null;
      }
    }

    this.pollTimer = window.setInterval(() => {
      void this.syncSession(sessionToken);
    }, this.options.pollIntervalMs);

    void this.syncSession(sessionToken);

    if (this.options.mode === 'iframe') {
      this.attachPostMessageListener();
    }
  }

  private attachPostMessageListener(): void {
    if (this.postMessageHandler || typeof window === 'undefined') {
      return;
    }
    const expectedToken = this.session?.postMessageToken;
    if (!expectedToken) {
      return;
    }
    const expectedOrigin = (() => {
      try {
        return new URL(this.session!.checkoutUrl).origin;
      } catch {
        return null;
      }
    })();

    const handler = (event: MessageEvent): void => {
      // Accept messages only from the hosted-checkout origin.
      if (expectedOrigin && event.origin !== expectedOrigin) {
        return;
      }
      const payload = event.data as
        | { type?: string; token?: string; data?: unknown }
        | null
        | undefined;
      if (!payload || typeof payload !== 'object') {
        return;
      }
      // Token-bound: drop messages that don't carry our session's token.
      if (payload.token !== expectedToken) {
        return;
      }
      if (typeof payload.type !== 'string') {
        return;
      }
      // Trigger a server fetch — never trust postMessage data as authoritative.
      if (this.session) {
        void this.syncSession(this.session.sessionToken);
      }
    };

    window.addEventListener('message', handler);
    this.postMessageHandler = handler;
  }

  private detachPostMessageListener(): void {
    if (this.postMessageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.postMessageHandler);
    }
    this.postMessageHandler = null;
  }

  private async syncSession(sessionToken: string): Promise<void> {
    if (!this.isOpen || this.completed || this.destroyed || !this.session) {
      return;
    }

    try {
      const session = await this.fetchSession(sessionToken);

      if (this.isExpired(session)) {
        const expiredPayload: CheckoutExpiredPayload = { sessionToken, session };
        this.emit('expired', expiredPayload);
        this.emitError(new CheckoutSDKError('Checkout session has expired', 'session_expired'));
        this.close('expired');
        return;
      }

      const previous = this.currentStatus;
      const current = session.invoice.status;

      if (previous !== current) {
        this.emit('status', {
          status: current,
          previousStatus: previous ?? undefined,
          invoice: session.invoice,
          session,
        });

        if (this.options.onStatusChange) {
          this.options.onStatusChange({
            status: current,
            previousStatus: previous ?? undefined,
            invoice: session.invoice,
            session,
          });
        }

        const statusEvent = current === 'completed' ? undefined : eventNameForStatus[current];
        if (statusEvent) {
          this.emit(statusEvent, { invoice: session.invoice, session });
        }
      }

      if (current === 'completed') {
        this.completed = true;
        this.emit('payment.completed', { invoice: session.invoice, session });
        this.options.onSuccess?.({ invoice: session.invoice, session });

        if (this.options.autoClose) {
          this.close('completed');
        }

        return;
      }

      this.session = session;
      this.currentStatus = current;
    } catch (error) {
      this.emitError(error);
      this.close('error');
    }
  }

  private isExpired(session: CheckoutSessionResponse): boolean {
    if (!session.expiresAt) {
      return false;
    }

    const expiry = Date.parse(session.expiresAt);
    if (Number.isNaN(expiry)) {
      return false;
    }

    return Date.now() > expiry;
  }

  private cleanupOpen(): void {
    this.isOpen = false;

    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.popupPollTimer !== null) {
      window.clearInterval(this.popupPollTimer);
      this.popupPollTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.detachPostMessageListener();

    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
    }
    this.popupWindow = null;

    if (this.iframeContainer) {
      this.iframeContainer.remove();
    }
    this.iframeElement = null;
    this.iframeContainer = null;
  }

  private resetForOpen(): void {
    this.session = null;
    this.currentStatus = null;
    this.completed = false;
  }

  private ensureBrowserEnvironment(): void {
    if (typeof window === 'undefined' || !window.fetch) {
      throw new CheckoutSDKError('SwiftPay checkout SDK requires a browser environment', 'no_browser');
    }
  }
}

declare global {
  interface Window {
    SwiftPayCheckout?: typeof SwiftPayCheckout;
  }
}

if (typeof window !== 'undefined') {
  window.SwiftPayCheckout = SwiftPayCheckout;
}

export default SwiftPayCheckout;
