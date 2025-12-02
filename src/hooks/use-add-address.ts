'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addAddress } from '@/actions/add-address.actions'
import { toast } from 'sonner'

interface UseAddAddressOptions {
  onSuccess?: (data: Awaited<ReturnType<typeof addAddress>>) => void
}

export function useAddAddress(options?: UseAddAddressOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addAddress,
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.error || 'Failed to add address')
        return
      }

      toast.success('Address added successfully!')

      // Invalidate customer queries to refresh locations
      if (data.customer) {
        queryClient.invalidateQueries({ queryKey: ['customer-from-phone'] })
        queryClient.invalidateQueries({ queryKey: ['customer'] })
      }

      // Call custom success handler if provided
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add address')
    },
  })
}
