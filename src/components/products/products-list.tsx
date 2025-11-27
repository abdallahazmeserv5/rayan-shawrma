'use client'

import { getCategories } from '@/actions/categories.actions'
import { getProducts } from '@/actions/products.actions'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { ProductCard } from './product-card'

export function ProductsList() {
  const locale = useLocale() as 'ar' | 'en'
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const t = useTranslations()
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
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
      {/* Category Tabs */}
      {hasCategories && (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">{t('allProducts')}</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
