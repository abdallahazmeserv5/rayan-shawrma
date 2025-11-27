'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ShoppingCart, Loader2, Phone, MapPin, Plus } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { CartItem } from './cart-item'
import { CheckoutDialog } from '../checkout/checkout-dialog'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getStoreSettings } from '@/actions/settings.actions'
import { getCustomerByPhone } from '@/actions/customers.actions'
import { quickCheckout } from '@/actions/quick-checkout.actions'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import type { Location } from '@/payload-types'

export function FloatingCart() {
  const { items, itemCount, subtotal, clearCart } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const locale = useLocale() as 'ar' | 'en'
  const searchParams = useSearchParams()
  const phoneFromUrl = searchParams.get('phone')

  const { data: settingsData } = useQuery({
    queryKey: ['store-settings', locale],
    queryFn: () => getStoreSettings(locale),
  })

  // Fetch customer data if phone is in URL
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer-from-url', phoneFromUrl],
    queryFn: () => getCustomerByPhone(phoneFromUrl!),
    enabled: !!phoneFromUrl && phoneFromUrl.length >= 8,
  })

  const customer = customerData?.customer

  // Filter valid locations from customer data
  const customerLocations = useMemo(() => {
    if (!customer?.locations || !Array.isArray(customer.locations)) {
      return []
    }

    return customer.locations.filter((loc): loc is Location => {
      return typeof loc === 'object' && loc !== null && 'id' in loc
    })
  }, [customer])

  // Auto-select first location if available and none selected
  useEffect(() => {
    if (customerLocations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(customerLocations[0].id)
    }
  }, [customerLocations, selectedLocationId])

  const quickCheckoutMutation = useMutation({
    mutationFn: quickCheckout,
    onSuccess: (data) => {
      if (!data.success) {
        toast.error(data.error || 'Order creation failed')
        return
      }

      toast.success('Your order has been created successfully!')
      clearCart()
      setIsOpen(false)
      setSelectedLocationId('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Order creation failed')
    },
  })

  const deliveryFee = settingsData?.settings?.deliveryFee || 0
  const currency = settingsData?.settings?.currency || 'KWD'
  const total = subtotal + deliveryFee

  const handleCheckout = () => {
    // If we have phone from URL and a selected location, create order directly
    if (phoneFromUrl && selectedLocationId && customer) {
      quickCheckoutMutation.mutate({
        phone: phoneFromUrl,
        locationId: selectedLocationId,
        items: items.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
        })),
      })
    } else {
      // Otherwise, open checkout dialog
      setIsOpen(false)
      setShowCheckout(true)
    }
  }

  const canQuickCheckout = phoneFromUrl && selectedLocationId && customer && items.length > 0
  const isProcessing = quickCheckoutMutation.isPending

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 start-6 rounded-full shadow-lg h-14 w-14 p-0 z-40 flex items-center justify-center"
          >
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full flex items-center justify-center text-xs"
              >
                {itemCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-md p-4">
          <SheetHeader>
            <SheetTitle>Your Cart ({itemCount} items)</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full mt-6">
            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
                  {/* Cart Items */}
                  <div>
                    {items.map((item) => (
                      <CartItem key={item.product.id} item={item} />
                    ))}
                  </div>

                  {/* Customer Info Section */}
                  <div className="border-t pt-4 space-y-4">
                    {/* Case 1: No Phone Number */}
                    {!phoneFromUrl && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">
                          There is no phone number
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            setIsOpen(false)
                            setShowCheckout(true)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Case 2: Phone exists, loading */}
                    {phoneFromUrl && isLoadingCustomer && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ms-2 text-sm text-muted-foreground">
                          Loading customer info...
                        </span>
                      </div>
                    )}

                    {/* Case 3: Phone exists, loaded */}
                    {phoneFromUrl && !isLoadingCustomer && (
                      <>
                        {/* Phone Display */}
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Phone:</span>
                          <span>{phoneFromUrl}</span>
                        </div>

                        {/* Location Section */}
                        {customer && customerLocations.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>Select Delivery Location:</span>
                            </div>
                            <RadioGroup
                              value={selectedLocationId}
                              onValueChange={setSelectedLocationId}
                            >
                              {customerLocations.map((location) => (
                                <div key={location.id} className="flex items-start space-x-2">
                                  <RadioGroupItem
                                    value={location.id}
                                    id={location.id}
                                    className="mt-1"
                                  />
                                  <Label
                                    htmlFor={location.id}
                                    className="font-normal cursor-pointer text-sm leading-relaxed"
                                  >
                                    {location.description}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        ) : (
                          /* Case 4: Phone exists but no locations (or customer not found) */
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <span className="text-sm text-muted-foreground">No location</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground"
                              onClick={() => {
                                setIsOpen(false)
                                setShowCheckout(true)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      {subtotal.toFixed(3)} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span className="font-medium">
                      {deliveryFee.toFixed(3)} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>
                      {total.toFixed(3)} {currency}
                    </span>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full mt-4"
                    size="lg"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        Creating Order...
                      </>
                    ) : canQuickCheckout ? (
                      'Create Order'
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={showCheckout}
        onOpenChange={setShowCheckout}
        initialPhone={phoneFromUrl || undefined}
      />
    </>
  )
}
