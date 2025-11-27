'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ShoppingCart, Loader2, X } from 'lucide-react'
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
  const [phoneInput, setPhoneInput] = useState('')
  const locale = useLocale() as 'ar' | 'en'
  const searchParams = useSearchParams()
  const phoneFromUrl = searchParams.get('phone')

  const { data: settingsData } = useQuery({
    queryKey: ['store-settings', locale],
    queryFn: () => getStoreSettings(locale),
  })

  // Fetch customer data based on phone input or URL
  const phoneToSearch = phoneInput || phoneFromUrl
  const { data: customerData, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer-from-phone', phoneToSearch],
    queryFn: () => getCustomerByPhone(phoneToSearch!),
    enabled: !!phoneToSearch && phoneToSearch.length >= 8,
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
      setPhoneInput('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Order creation failed')
    },
  })

  const deliveryFee = settingsData?.settings?.deliveryFee || 0
  const currency = settingsData?.settings?.currency || 'KWD'
  const tax = subtotal * 0.1 // 10% tax
  const total = subtotal + deliveryFee

  const handleCheckout = () => {
    const phone = phoneInput || phoneFromUrl
    if (phone && selectedLocationId && customer) {
      quickCheckoutMutation.mutate({
        phone,
        locationId: selectedLocationId,
        items: items.map((item) => ({
          productId: item.product.id,
          qty: item.qty,
        })),
      })
    } else {
      setIsOpen(false)
      setShowCheckout(true)
    }
  }

  const canCheckout = (phoneInput || phoneFromUrl) && selectedLocationId && items.length > 0
  const isProcessing = quickCheckoutMutation.isPending

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 start-6 rounded-full shadow-lg h-14 w-14 p-0 z-40 flex items-center justify-center bg-black hover:bg-gray-800"
          >
            <ShoppingCart className="h-6 w-6 text-white" />
            {itemCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full flex items-center justify-center text-xs bg-yellow-500 text-black border-0"
              >
                {itemCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-md p-0 bg-black border-0 flex flex-col">
          <SheetHeader className="p-4 pb-0 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white text-lg">سلة التسوق ({itemCount})</SheetTitle>
              <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/60">Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <CartItem key={item.product.id} item={item} />
                  ))}
                </div>

                {/* Phone Number Input */}
                <div className="bg-white rounded-xl p-4">
                  <Label htmlFor="phone" className="text-right block mb-2 font-bold">
                    رقم الهاتف
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="01016945354"
                    value={phoneInput || phoneFromUrl || ''}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="text-center"
                    dir="ltr"
                  />
                </div>

                {/* Address Selection */}
                {customer && customerLocations.length > 0 ? (
                  <div className="bg-white rounded-xl p-4">
                    <Label className="text-right block mb-3 font-bold">العنوان</Label>
                    <RadioGroup value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <div className="grid grid-cols-2 gap-3">
                        {customerLocations.map((location) => (
                          <div key={location.id} className="relative">
                            <RadioGroupItem
                              value={location.id}
                              id={location.id}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={location.id}
                              className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 p-3 cursor-pointer hover:bg-gray-50 peer-data-[state=checked]:border-yellow-500 peer-data-[state=checked]:bg-yellow-50"
                            >
                              <span className="text-sm font-medium text-center">
                                {location.description}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">{location.city}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                    <div className="mt-3 text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-yellow-500 hover:text-yellow-600"
                        onClick={() => {
                          setIsOpen(false)
                          setShowCheckout(true)
                        }}
                      >
                        + إضافة عنوان جديد
                      </Button>
                    </div>
                  </div>
                ) : phoneToSearch && phoneToSearch.length >= 8 && !isLoadingCustomer ? (
                  <div className="bg-white rounded-xl p-4">
                    <Label className="text-right block mb-3 font-bold">العنوان</Label>
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-3">لا توجد عناوين محفوظة</p>
                      <Button
                        type="button"
                        onClick={() => {
                          setIsOpen(false)
                          setShowCheckout(true)
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        + إضافة عنوان جديد
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Order Summary */}
                <div className="bg-white rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>الإجمالي</span>
                    <span className="font-bold">{subtotal.toFixed(0)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>الضريبة (10%)</span>
                    <span className="font-bold">{tax.toFixed(0)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span>الإجمالي</span>
                    <span>{total.toFixed(0)} ج.م</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <Label className="text-white text-right block mb-3 font-bold">طريقة الدفع</Label>
                  <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      </div>
                      <span className="font-medium">دفع عند الإستلام</span>
                    </div>
                    <span className="text-2xl">💵</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg h-14 rounded-xl"
                  disabled={!canCheckout || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="me-2 h-5 w-5 animate-spin" />
                      جاري المعالجة...
                    </>
                  ) : (
                    'تأكيد الطلب'
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={showCheckout}
        onOpenChange={setShowCheckout}
        initialPhone={phoneInput || phoneFromUrl || undefined}
      />
    </>
  )
}
