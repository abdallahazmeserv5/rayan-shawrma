'use client'

import { Plus, Minus, ShoppingCart } from 'lucide-react'
import type { Product, Media } from '@/payload-types'
import { useState } from 'react'
import { useCart } from '@/lib/cart-context'
import ImageFallback from '../image-fallback'
import { toast } from 'sonner'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [qty, setQty] = useState(1)
  const { addItem } = useCart()

  const incrementQty = () => {
    const newQty = qty + 1
    setQty(newQty)
  }

  const decrementQty = () => {
    if (qty > 1) {
      const newQty = qty - 1
      setQty(newQty)
    }
  }

  const handleAddToCart = () => {
    addItem(product, qty)
    toast.success(`Added ${qty} ${product.title} to cart`)
    setQty(1)
  }

  const imageUrl =
    product.image && typeof product.image === 'object' ? (product.image as Media).url : null

  return (
    <div className="bg-[#F8F8F8] rounded-2xl overflow-hidden shadow-sm border border-gray-100 p-3 relative">
      {/* Product Image - Circular */}
      <div className="w-full rounded-full flex items-center justify-center mb-3 overflow-hidden">
        {imageUrl ? (
          <ImageFallback
            src={imageUrl}
            alt={product.title || 'Product'}
            width={80}
            height={80}
            className="object-contain max-w-20 max-h-20"
          />
        ) : (
          <div className="text-6xl">🍽️</div>
        )}
      </div>

      {/* Product Info */}
      <div className="text-center">
        <h3 className="font-bold text-base mb-1 line-clamp-1">{product.title}</h3>
        <p className="text-black font-bold text-sm mb-3">{product.price.toFixed(0)} ج.م</p>

        {/* Quantity Controls */}
        <div className="flex items-center justify-center gap-3 bg-white rounded-lg w-fit mx-auto p-2 ">
          <button
            onClick={incrementQty}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} strokeWidth={3} />
          </button>
          <span className="text-base font-bold min-w-[20px] text-center">{qty}</span>
          <button
            onClick={decrementQty}
            disabled={qty <= 1}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus size={14} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Add to Cart Icon - Floating */}
      <button
        onClick={handleAddToCart}
        className="absolute bottom-3 end-3 size-8 flex items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 transition-all hover:scale-110 shadow-lg"
        aria-label="Add to cart"
      >
        <ShoppingCart size={18} />
      </button>
    </div>
  )
}
