'use client'

import { getCategories } from '@/actions/categories.actions'
import { getProducts } from '@/actions/products.actions'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { useState } from 'react'
import { ProductCard } from './product-card'
import type { Media } from '@/payload-types'
import ImageFallback from '../image-fallback'

export function ProductsList() {
  const locale = useLocale() as 'ar' | 'en'
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', locale],
    queryFn: () => getCategories(locale),
    staleTime: 1000 * 60 * 5,
  })

  // Fetch products based on selected category
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', locale, selectedCategory],
    queryFn: () => getProducts(locale, selectedCategory === 'all' ? undefined : selectedCategory),
    staleTime: 1000 * 60 * 5,
  })

  const categories = categoriesData?.categories || []
  const hasCategories = categories.length > 0

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-full" />
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load products. Please try again.</p>
      </div>
    )
  }

  if (!data?.success || !data.products || data.products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products available at the moment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Tabs - Horizontal Scroll with Circular Images */}
      {hasCategories && (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max px-4">
            {/* All Categories */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex flex-col items-center gap-2 min-w-[80px] ${
                selectedCategory === 'all' ? 'opacity-100' : 'opacity-60'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center overflow-hidden">
                <span className="text-white text-2xl">🍽️</span>
              </div>
              <span className="text-sm font-medium">الكل</span>
            </button>

            {/* Category Items */}
            {categories.map((category) => {
              const imageUrl =
                category.image && typeof category.image === 'object'
                  ? (category.image as Media).url
                  : null

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex flex-col items-center gap-2 min-w-[80px] ${
                    selectedCategory === category.id ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-amber-50 to-orange-50 flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                      <ImageFallback
                        src={imageUrl}
                        alt={category.name}
                        width={64}
                        height={64}
                        className="object-cover max-size-16 w-full h-full"
                      />
                    ) : (
                      <span className="text-2xl">📦</span>
                    )}
                  </div>
                  <span className="text-sm font-medium line-clamp-1">{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Products Grid - 2 Columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 px-4">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
