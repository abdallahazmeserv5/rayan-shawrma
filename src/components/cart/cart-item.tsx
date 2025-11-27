'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Minus, Plus, X } from 'lucide-react'
import type { CartItem as CartItemType } from '@/lib/cart-context'
import { useCart } from '@/lib/cart-context'
import type { Media } from '@/payload-types'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { updateQty, removeItem } = useCart()

  const imageUrl =
    item.product.image && typeof item.product.image === 'object'
      ? (item.product.image as Media).url
      : null

  const lineTotal = item.product.price * item.qty

  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      {imageUrl && (
        <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
          <Image
            src={imageUrl}
            alt={item.product.title || 'Product'}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-1">{item.product.title}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => removeItem(item.product.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQty(item.product.id, item.qty - 1)}
              disabled={item.qty <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>

            <span className="text-sm font-medium min-w-[1.5rem] text-center">{item.qty}</span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateQty(item.product.id, item.qty + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="text-sm font-semibold">{lineTotal.toFixed(3)}</div>
        </div>
      </div>
    </div>
  )
}
