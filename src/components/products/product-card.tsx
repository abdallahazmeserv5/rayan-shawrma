'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Minus } from 'lucide-react'
import type { Product, Media } from '@/payload-types'
import { useState } from 'react'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'
import ImageFallback from '../image-fallback'
import { useTranslations } from 'next-intl'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [qty, setQty] = useState(1)
  const { addItem } = useCart()
  const t = useTranslations()
  const handleAddToCart = () => {
    addItem(product, qty)
    toast.success(`Added ${qty} ${product.title} to cart`)
    setQty(1) // Reset quantity
  }

  const incrementQty = () => setQty((prev) => prev + 1)
  const decrementQty = () => setQty((prev) => (prev > 1 ? prev - 1 : 1))

  const imageUrl =
    product.image && typeof product.image === 'object' ? (product.image as Media).url : null

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {imageUrl && (
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
          <ImageFallback
            src={imageUrl}
            alt={product.title || 'Product'}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      <CardHeader>
        <CardTitle className="line-clamp-2">{product.title}</CardTitle>
        {product.description && (
          <CardDescription className="line-clamp-2">{product.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold text-primary">{product.price.toFixed(3)}</div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <div className="flex items-center justify-center gap-3 w-full">
          <Button variant="outline" size="icon" onClick={decrementQty} disabled={qty <= 1}>
            <Minus className="h-4 w-4" />
          </Button>

          <span className="text-lg font-semibold min-w-8 text-center">{qty}</span>

          <Button variant="outline" size="icon" onClick={incrementQty}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={handleAddToCart} className="w-full" size="lg">
          {t('addToCart')}
        </Button>
      </CardFooter>
    </Card>
  )
}
