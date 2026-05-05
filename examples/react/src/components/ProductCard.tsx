import './ProductCard.css'

interface Product {
  id: string
  name: string
  description: string
  emoji: string
  price: number
}

interface ProductCardProps {
  product: Product
  isLoading: boolean
  onBuy: () => void
}

export default function ProductCard({ product, isLoading, onBuy }: ProductCardProps) {
  return (
    <div className="product-card">
      <div className="product-image">{product.emoji}</div>
      <div className="product-name">{product.name}</div>
      <div className="product-desc">{product.description}</div>
      <div className="product-price">
        <span className="price-amount">${product.price.toFixed(2)}</span>
        <span className="price-currency">USD</span>
      </div>
      <button
        className="buy-button"
        onClick={onBuy}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Buy Now'}
      </button>
    </div>
  )
}
