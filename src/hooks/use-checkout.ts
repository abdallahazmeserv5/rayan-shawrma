'use client'

import { useMutation } from '@tanstack/react-query'
import { checkout } from '@/actions/checkout.actions'
import { useCart } from '@/lib/cart-context'
import { toast } from 'sonner'

export function useCheckout() {
  const { clearCart } = useCart()

  return useMutation({
    mutationFn: checkout,
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.error || 'Checkout failed')
        return
      }

      // COMMENTED OUT - MyFatoorah payment temporarily disabled
      /*
      if (data.paymentUrl) {
        // Redirect to MyFatoorah payment page
        window.location.href = data.paymentUrl
      } else {
      */
      {
        // COD order - show success message
        toast.success('Order placed successfully!')
        clearCart()
        // Optionally redirect to order confirmation page
        // router.push(`/order/${data.orderId}`)
      }
      // */
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Checkout failed')
    },
  })
}
