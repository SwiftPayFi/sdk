import { useState } from 'react'
import { useSwiftPayCheckout } from '@swiftpayfi/checkout-sdk/react'
import './App.css'
import ProductCard from './components/ProductCard'
import CheckoutStatus from './components/CheckoutStatus'
import ModeSelector from './components/ModeSelector'
import MessageList from './components/MessageList'

const PRODUCTS = [
  { id: 'song-01',    name: 'Premium Song',         description: 'High-quality audio download',    emoji: '🎵', price: 9.99 },
  { id: 'app-01',     name: 'Premium App',           description: 'Lifetime license & updates',     emoji: '📱', price: 49.99 },
  { id: 'dlc-01',     name: 'Game DLC Pack',         description: '3 expansions + cosmetics',       emoji: '🎮', price: 24.99 },
  { id: 'course-01',  name: 'Online Course',         description: '12-week certification program',  emoji: '🎓', price: 199.99 },
  { id: 'nft-01',     name: 'Digital Art NFT',       description: 'Limited edition 1/100',          emoji: '🖼️', price: 99.99 },
  { id: 'coffee-01',  name: 'Coffee Subscription',   description: 'Monthly specialty beans',        emoji: '☕', price: 19.99 },
]

type CheckoutMode = 'popup' | 'iframe' | 'redirect'
type Message = { id: string; text: string; type: 'info' | 'success' | 'error' }

// ---------------------------------------------------------------------------
// Server-side step: your backend creates the invoice with your secret key.
// The browser never sees the secret key or controls payment parameters.
// Replace this with a real fetch to your own API endpoint.
// ---------------------------------------------------------------------------
async function createInvoiceOnServer(product: { id: string; name: string }): Promise<string> {
  const res = await fetch('/api/create-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: product.id, productName: product.name }),
  })
  if (!res.ok) throw new Error('Failed to create invoice on server')
  const { invoiceId } = await res.json()
  return invoiceId
}

export default function App() {
  const [mode, setMode] = useState<CheckoutMode>('popup')
  const [messages, setMessages] = useState<Message[]>([])

  const {
    createSession,
    open,
    isLoading,
    session,
    status,
    error,
  } = useSwiftPayCheckout({
    key: 'pk_test_G2ok56N9gFFbia3jSQ8hjJZpAvv9m68iAgg2CTeWw2AT', // Replace with your publishable key
    mode,
    sandbox: true,
    onSuccess: ({ invoice }) => {
      addMessage(`✅ Payment completed! Reference: ${invoice.reference}`, 'success')
    },
    onError: (error) => {
      addMessage(`Error: ${error.message}`, 'error')
    },
  })

  const addMessage = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9)
    setMessages((prev) => [...prev, { id, text, type }])
    setTimeout(() => removeMessage(id), 6000)
  }

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  const handleBuy = async (product: (typeof PRODUCTS)[0]) => {
    try {
      // Step 1 — server creates the invoice (secret key, server-side only)
      const invoiceId = await createInvoiceOnServer(product)

      // Step 2 — SDK attaches a checkout session to that invoice (publishable key)
      const invoiceSession = await createSession({ invoiceId })
      if (!invoiceSession) throw new Error('Failed to create checkout session')

      addMessage(`Session created for ${product.name}`, 'success')

      await open()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      addMessage(`Error: ${message}`, 'error')
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SwiftPay Checkout</h1>
        <p className="subtitle">React Example with Multiple Products</p>
      </header>

      <MessageList messages={messages} onRemove={removeMessage} />

      <ModeSelector currentMode={mode} onModeChange={setMode} />

      {mode === 'iframe' && <div id="checkout-container" className="iframe-container" />}

      <CheckoutStatus
        mode={mode}
        status={status}
        session={session}
        isLoading={isLoading}
        error={error}
      />

      <div className="divider" />

      <section className="products-section">
        <h2>Products</h2>
        <div className="products-grid">
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isLoading={isLoading}
              onBuy={() => handleBuy(product)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
