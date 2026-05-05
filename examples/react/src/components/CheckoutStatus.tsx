import { CheckoutSessionResponse, InvoiceStatus, CheckoutSDKError } from '@swiftpayfi/checkout-sdk'
import './CheckoutStatus.css'

type CheckoutMode = 'popup' | 'iframe' | 'redirect'

interface CheckoutStatusProps {
  mode: CheckoutMode
  status: InvoiceStatus | null
  session: CheckoutSessionResponse | null
  isLoading: boolean
  error: CheckoutSDKError | null
}

export default function CheckoutStatus({
  mode,
  status,
  session,
  isLoading,
  error,
}: CheckoutStatusProps) {
  return (
    <div className="status-display">
      <div className="status-item">
        <span className="status-label">Current Mode:</span>
        <span className="status-value">{mode}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Loading:</span>
        <span className="status-value">{isLoading ? '⏳ Yes' : '✓ No'}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Invoice Status:</span>
        <span className="status-value">{status || '–'}</span>
      </div>
      {session?.invoice && (
        <>
          <div className="status-item">
            <span className="status-label">Reference:</span>
            <span className="status-value">{session.invoice.reference}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Amount Expected:</span>
            <span className="status-value">${session.invoice.amountExpected.toFixed(2)}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Pending Amount:</span>
            <span className="status-value">${session.invoice.pendingAmount.toFixed(2)}</span>
          </div>
        </>
      )}
      {error && (
        <div className="status-item error">
          <span className="status-label">Error:</span>
          <span className="status-value error-text">{error.message}</span>
        </div>
      )}
    </div>
  )
}
