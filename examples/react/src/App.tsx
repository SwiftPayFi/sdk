import { useState } from 'react'
import { useSwiftPayCheckout } from '@swiftpayfi/checkout-sdk/react'
import './App.css'
import ProductCard from './components/ProductCard'
import CheckoutStatus from './components/CheckoutStatus'
import ModeSelector from './components/ModeSelector'
import MessageList from './components/MessageList'

const PRODUCTS = [
  {
    id: 'song-01',
    name: 'Premium Song',
    description: 'High-quality audio download',
    emoji: '🎵',
    price: 9.99,
  },
  {
    id: 'app-01',
    name: 'Premium App',
    description: 'Lifetime license & updates',
    emoji: '📱',
    price: 49.99,
  },
  {
    id: 'dlc-01',
    name: 'Game DLC Pack',
    description: '3 expansions + cosmetics',
    emoji: '🎮',
    price: 24.99,
  },
  {
    id: 'course-01',
    name: 'Online Course',
    description: '12-week certification program',
    emoji: '🎓',
    price: 199.99,
  },
  {
    id: 'nft-01',
    name: 'Digital Art NFT',
    description: 'Limited edition 1/100',
    emoji: '🖼️',
    price: 99.99,
  },
  {
    id: 'coffee-01',
    name: 'Coffee Subscription',
    description: 'Monthly specialty beans',
    emoji: '☕',
    price: 19.99,
  },
]

type CheckoutMode = 'popup' | 'iframe' | 'redirect'
type Message = { id: string; text: string; type: 'info' | 'success' | 'error' }

export default function App() {
  const [mode, setMode] = useState<CheckoutMode>('popup')
  const [messages, setMessages] = useState<Message[]>([])

  const {
    createInvoice,
    open,
    isLoading,
    session,
    status,
    error,
  } = useSwiftPayCheckout({
    // Uses local SDK from ../../checkout (file: protocol in package.json)
    key: 'pk_test_G2ok56N9gFFbia3jSQ8hjJZpAvv9m68iAgg2CTeWw2AT', // Replace with your publishable key
    token: 'USDC',
    chains: ['sepolia', 'base-sepolia', 'solana-devnet'],
    mode,
    sandbox: true, // Use sandbox for testing
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
    // if (!session) {
    //   addMessage('Please set your publishable key in App.tsx', 'error')
    //   return
    // }

    try {
      const invoiceSession = await createInvoice({
        amount: product.price,
        reference: `order-${Date.now()}`,
        metadata: {
          productId: product.id,
          productName: product.name,
          userId: 'user-123',
        },
      })

      if (!invoiceSession) {
        throw new Error('Failed to create invoice')
      }

      addMessage(`Invoice created for ${product.name}`, 'success')

      const openSession = await open()
      if (!openSession) {
        throw new Error('Failed to open checkout')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      addMessage(`Error: ${message}`, 'error')
    }
  }

  // if (!session) {
  //   return (
  //     <div className="app-container">
  //       <header className="app-header">
  //         <h1>SwiftPay Checkout</h1>
  //         <p className="subtitle">React Example</p>
  //       </header>
  //       <div className="error-banner">
  //         <p>
  //           ⚠️ Please update your publishable key in <code>src/App.tsx</code> line 65
  //         </p>
  //         <p>Get one from https://dashboard.swiftpay.finance</p>
  //       </div>
  //     </div>
  //   )
  // }

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
