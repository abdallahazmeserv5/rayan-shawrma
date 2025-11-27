'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useCheckout } from '@/hooks/use-checkout'
import { useQuery } from '@tanstack/react-query'
import { getCustomerByPhone } from '@/actions/customers.actions'
import { useDebounce } from '@/hooks/use-debounce'
import { PhoneInput } from '../ui/phone-input'

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPhone?: string
}

// --------------------
// Validation Schema
// --------------------
const checkoutSchema = z.object({
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  phone2: z.string().optional(),
  name: z.string().min(1, 'Name is required').optional(),
  selectedLocationId: z.string().optional(),
  newLocation: z
    .object({
      description: z.string().min(1, 'Description required'),
      city: z.string().min(1, 'City required'),
      neighborhood: z.string().min(1, 'Neighborhood required'),
      street: z.string().min(1, 'Street required'),
      apartmentNumber: z.string().optional(),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  paymentMethod: z.enum(['cod' /* , 'myfatoorah' */]),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

export function CheckoutDialog({ open, onOpenChange, initialPhone }: CheckoutDialogProps) {
  const { items } = useCart()
  const checkoutMutation = useCheckout()
  const debouncedPhone = useDebounce(initialPhone || '', 500)

  // --------------------
  // React Hook Form Setup
  // --------------------
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phone: initialPhone || '',
      phone2: '',
      name: '',
      selectedLocationId: '',
      newLocation: undefined,
      paymentMethod: 'cod',
    },
  })

  const { watch, setValue, reset } = form
  const phone = watch('phone')
  const selectedLocationId = watch('selectedLocationId')
  const newLocation = watch('newLocation')

  // --------------------
  // Fetch Customer by Phone
  // --------------------
  const { data: customerData, isLoading: isCheckingCustomer } = useQuery({
    queryKey: ['customer', phone],
    queryFn: () => getCustomerByPhone(phone),
    enabled: phone.length >= 8,
  })

  const customer = customerData?.customer

  // --------------------
  // Reset form when dialog closes
  // --------------------
  useEffect(() => {
    if (!open) {
      reset({
        phone: initialPhone || '',
        phone2: '',
        name: '',
        selectedLocationId: '',
        newLocation: undefined,
        paymentMethod: 'cod',
      })
    }
  }, [open, initialPhone, reset])

  // --------------------
  // Submit Handler
  // --------------------
  const onSubmit = (values: CheckoutFormValues) => {
    if (!customer && !values.name) return
    if (!values.selectedLocationId && !values.newLocation) return

    checkoutMutation.mutate({
      phone: values.phone,
      phone2: values.phone2 || undefined,
      name: customer ? undefined : values.name,
      location: values.selectedLocationId
        ? { id: values.selectedLocationId }
        : values.newLocation || undefined,
      items: items.map((item) => ({
        productId: item.product.id,
        qty: item.qty,
      })),
      paymentMethod: values.paymentMethod,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* Phone */}

            <div className="flex gap-4 items-center">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="flex-1" dir="ltr">
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} placeholder="Enter phone number" />
                    </FormControl>
                    <FormMessage />
                    {isCheckingCustomer && (
                      <p className="text-sm text-muted-foreground">Checking...</p>
                    )}
                    {customer && (
                      <p className="text-sm text-green-600">Welcome back, {customer.name}!</p>
                    )}
                  </FormItem>
                )}
              />

              {/* Secondary Phone */}
              <FormField
                control={form.control}
                name="phone2"
                render={({ field }) => (
                  <FormItem className="flex-1 self-start" dir="ltr">
                    <FormLabel>Secondary Phone (Optional)</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} placeholder="Enter secondary phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Name */}
            {!customer && phone.length >= 8 && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Location Selection */}
            {!!customer?.locations?.length && (
              <FormField
                control={form.control}
                name="selectedLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Delivery Location *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a saved location" />
                      </SelectTrigger>
                      <SelectContent>
                        {customer?.locations?.map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setValue('selectedLocationId', '')}
                      >
                        Or add a new location
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* New Location Fields */}
            {(!customer || !selectedLocationId) && phone.length >= 8 && (
              <>
                <FormField
                  control={form.control}
                  name="newLocation.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Description *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Home, Office, Building 5…" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newLocation.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="newLocation.neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Neighborhood *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter neighborhood" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newLocation.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter street" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="newLocation.apartmentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apartment Number (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newLocation.lat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step={0.000001}
                            placeholder="Latitude"
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newLocation.lng"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step={0.000001}
                            placeholder="Longitude"
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cod" id="cod" />
                        <FormLabel htmlFor="cod" className="font-normal cursor-pointer">
                          Cash on Delivery
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={checkoutMutation.isPending}>
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
        </Form>
      </DialogContent>
    </Dialog>
  )
}
