'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCart } from '@/lib/cart-context'
import { useCheckout } from '@/hooks/use-checkout'
import { useQuery } from '@tanstack/react-query'
import { getCustomerByPhone } from '@/actions/customers.actions'
import { Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { LocationInput } from './location-input'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPhone?: string
}

export function CheckoutDialog({ open, onOpenChange, initialPhone }: CheckoutDialogProps) {
  const { items } = useCart()
  const checkoutMutation = useCheckout()

  const [phone, setPhone] = useState(initialPhone || '')
  const [phone2, setPhone2] = useState('')
  const [name, setName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cod' /* | 'myfatoorah' */>('cod')
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [newLocation, setNewLocation] = useState<{
    description: string
    lat: number
    lng: number
  } | null>(null)

  const debouncedPhone = useDebounce(phone, 500)

  // Update phone when initialPhone changes
  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone)
    }
  }, [initialPhone])

  // Check if customer exists
  const { data: customerData, isLoading: isCheckingCustomer } = useQuery({
    queryKey: ['customer', debouncedPhone],
    queryFn: () => getCustomerByPhone(debouncedPhone),
    enabled: debouncedPhone.length >= 8,
  })

  const customer = customerData?.customer

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      if (!initialPhone) setPhone('')
      setPhone2('')
      setName('')
      setPaymentMethod('cod')
      setSelectedLocationId('')
      setNewLocation(null)
    }
  }, [open, initialPhone])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!phone || phone.length < 8) {
      return
    }

    if (!customer && !name) {
      return
    }

    if (!selectedLocationId && !newLocation) {
      return
    }

    // Prepare checkout data
    checkoutMutation.mutate({
      phone,
      phone2: phone2 || undefined,
      name: customer ? undefined : name,
      location: selectedLocationId ? { id: selectedLocationId } : newLocation || undefined,
      items: items.map((item) => ({
        productId: item.product.id,
        qty: item.qty,
      })),
      paymentMethod,
    })
  }

  const isFormValid =
    phone.length >= 8 &&
    (customer || name) &&
    (selectedLocationId || newLocation) &&
    !checkoutMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {isCheckingCustomer && <p className="text-sm text-muted-foreground">Checking...</p>}
            {customer && <p className="text-sm text-green-600">Welcome back, {customer.name}!</p>}
          </div>

          {/* Secondary Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone2">Secondary Phone (Optional)</Label>
            <Input
              id="phone2"
              type="tel"
              placeholder="Enter secondary phone number"
              value={phone2}
              onChange={(e) => setPhone2(e.target.value)}
            />
          </div>

          {/* Name (only for new customers) */}
          {!customer && phone.length >= 8 && (
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Location Selection */}
          {customer &&
          customer.locations &&
          Array.isArray(customer.locations) &&
          customer.locations.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Delivery Location *</Label>
                <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a saved location" />
                  </SelectTrigger>
                  <SelectContent>
                    {customer.locations.map((loc) => {
                      const location = typeof loc === 'object' ? loc : null
                      if (!location) return null
                      return (
                        <SelectItem key={location.id} value={location.id}>
                          {location.description}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setSelectedLocationId('')
                    // Trigger new location input
                  }}
                >
                  Or add a new location
                </Button>
              </div>
            </div>
          ) : null}

          {/* New Location Input */}
          {(!customer || !selectedLocationId) && phone.length >= 8 && (
            <LocationInput onLocationChange={setNewLocation} />
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method *</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as 'cod' /* | 'myfatoorah' */)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="font-normal cursor-pointer">
                  Cash on Delivery
                </Label>
              </div>
              {/* COMMENTED OUT - MyFatoorah payment temporarily disabled */}
              {/*
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="myfatoorah" id="myfatoorah" />
                <Label htmlFor="myfatoorah" className="font-normal cursor-pointer">
                  Online Payment (MyFatoorah)
                </Label>
              </div>
              */}
            </RadioGroup>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg" disabled={!isFormValid}>
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
