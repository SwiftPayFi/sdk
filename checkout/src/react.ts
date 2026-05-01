import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SwiftPayCheckout,
  CheckoutSDKError,
  type CheckoutMode,
  type CheckoutSessionResponse,
  type CreateInvoiceOptions,
  type InvoiceStatus,
  type MerchantBranding,
  type SwiftPayCheckoutOptions,
} from './index';

export interface UseSwiftPayCheckoutOptions extends SwiftPayCheckoutOptions {
  key: string;
}

export interface UseSwiftPayCheckoutResult {
  instance: SwiftPayCheckout | null;
  createInvoice: (options: CreateInvoiceOptions) => Promise<CheckoutSessionResponse | null>;
  open: (openOptions?: { mode?: CheckoutMode }) => Promise<CheckoutSessionResponse | null>;
  close: () => void;
  isReady: boolean;
  isLoading: boolean;
  session: CheckoutSessionResponse | null;
  branding: MerchantBranding | null;
  status: InvoiceStatus | null;
  error: CheckoutSDKError | null;
}

export const useSwiftPayCheckout = (options: UseSwiftPayCheckoutOptions): UseSwiftPayCheckoutResult => {
  const callbacksRef = useRef<Pick<
    UseSwiftPayCheckoutOptions,
    'onLoad' | 'onOpen' | 'onClose' | 'onCancel' | 'onSuccess' | 'onError' | 'onStatusChange'
  >>(options);

  const instanceRef = useRef<SwiftPayCheckout | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [error, setError] = useState<CheckoutSDKError | null>(null);

  callbacksRef.current = {
    onLoad: options.onLoad,
    onOpen: options.onOpen,
    onClose: options.onClose,
    onCancel: options.onCancel,
    onSuccess: options.onSuccess,
    onError: options.onError,
    onStatusChange: options.onStatusChange,
  };

  useEffect(() => {
    const instance = new SwiftPayCheckout({
      ...options,
      onLoad: (payload) => {
        setSession(payload.session);
        setStatus(payload.session.invoice.status);
        setError(null);
        callbacksRef.current.onLoad?.(payload);
      },
      onOpen: callbacksRef.current.onOpen,
      onClose: callbacksRef.current.onClose,
      onCancel: callbacksRef.current.onCancel,
      onSuccess: (payload) => {
        setSession(payload.session);
        setStatus(payload.invoice.status);
        callbacksRef.current.onSuccess?.(payload);
      },
      onError: (err) => {
        setError(err);
        callbacksRef.current.onError?.(err);
      },
      onStatusChange: (payload) => {
        setSession(payload.session);
        setStatus(payload.status);
        callbacksRef.current.onStatusChange?.(payload);
      },
    });

    instanceRef.current = instance;
    setIsReady(true);

    return () => {
      instance.destroy();
      instanceRef.current = null;
      setIsReady(false);
      setSession(null);
      setStatus(null);
      setError(null);
    };
  }, [options.key, options.mode, options.sandbox]);

  const createInvoice = useCallback(
    async (invoiceOptions: CreateInvoiceOptions): Promise<CheckoutSessionResponse | null> => {
      if (!instanceRef.current) {
        return null;
      }

      try {
        setIsLoading(true);
        const sessionResponse = await instanceRef.current.createInvoice(invoiceOptions);
        setSession(sessionResponse);
        setStatus(sessionResponse.invoice.status);
        setError(null);
        return sessionResponse;
      } catch (err) {
        const checkoutError = err instanceof Error ? new CheckoutSDKError(err.message) : err;
        setError(checkoutError as CheckoutSDKError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const open = useCallback(
    async (openOptions?: { mode?: CheckoutMode }): Promise<CheckoutSessionResponse | null> => {
      if (!instanceRef.current) {
        return null;
      }

      try {
        setIsLoading(true);
        const sessionResponse = await instanceRef.current.open(openOptions);
        setSession(sessionResponse);
        return sessionResponse;
      } catch (err) {
        const checkoutError = err instanceof Error ? new CheckoutSDKError(err.message) : err;
        setError(checkoutError as CheckoutSDKError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const close = useCallback(() => {
    if (!instanceRef.current) {
      return;
    }

    instanceRef.current.close('manual');
  }, []);

  return {
    instance: instanceRef.current,
    createInvoice,
    open,
    close,
    isReady,
    isLoading,
    session,
    branding: session?.branding ?? null,
    status,
    error,
  };
};

export default useSwiftPayCheckout;
