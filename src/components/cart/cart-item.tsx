'use client'

import Image from 'next/image'
import { Minus, Plus } from 'lucide-react'
import type { CartItem as CartItemType } from '@/lib/cart-context'
import { useCart } from '@/lib/cart-context'
import type { Media } from '@/payload-types'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQty } = useCart()

  const imageUrl =
    item.product.image && typeof item.product.image === 'object'
      ? (item.product.image as Media).url
      : null

  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
      {/* Quantity Controls - Left Side */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => updateQty(item.product.id, item.qty + 1)}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors"
        >
          <Plus size={14} strokeWidth={3} />
        </button>
        <span className="text-white font-bold text-center text-sm">{item.qty}</span>
        <button
          onClick={() => updateQty(item.product.id, item.qty - 1)}
          disabled={item.qty <= 1}
          className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Minus size={14} strokeWidth={3} />
        </button>
      </div>

      {/* Product Info - Center */}
      <div className="flex-1 text-center">
        <h4 className="font-bold text-white text-sm mb-1">{item.product.title}</h4>
        <p className="text-white font-bold text-sm">{item.product.price.toFixed(0)} ج.م</p>
      </div>

      {/* Product Image - Right Side */}
      {imageUrl && (
        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white">
          <Image
            src={imageUrl}
            alt={item.product.title || 'Product'}
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      )}
    </div>
  )
}
