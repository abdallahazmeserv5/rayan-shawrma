'use client'

import { useQuery } from '@tanstack/react-query'
import { getLocationsByPhone } from '@/actions/get-locations-by-phone.actions'

interface UseLocationsByPhoneOptions {
  enabled?: boolean
}

export function useLocationsByPhone(phone: string, options?: UseLocationsByPhoneOptions) {
  return useQuery({
    queryKey: ['locations-by-phone', phone],
    queryFn: () => getLocationsByPhone(phone),
    enabled: options?.enabled !== false && phone.length >= 8,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
