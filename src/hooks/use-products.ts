'use client'

import { useQuery } from '@tanstack/react-query'
import { getProducts } from '@/actions/products.actions'
import { useLocale } from 'next-intl'

export function useProducts() {
  const locale = useLocale() as 'ar' | 'en'

  return useQuery({
    queryKey: ['products', locale],
    queryFn: () => getProducts(locale),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
