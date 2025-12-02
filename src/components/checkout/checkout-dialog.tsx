'use client'

import { getCustomerByPhone } from '@/actions/customers.actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAddAddress } from '@/hooks/use-add-address'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { PhoneInput } from '../ui/phone-input'

interface AddAddressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPhone: string
  onAddressAdded?: (locationId: string) => void
}

// --------------------
// Validation Schema
// --------------------
const addAddressSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').optional(),
  description: z.string().min(1, 'الوصف مطلوب'),
  city: z.string().min(1, 'المدينة مطلوبة'),
  neighborhood: z.string().min(1, 'الحي مطلوب'),
  street: z.string().min(1, 'الشارع مطلوب'),
  apartmentNumber: z.string().optional(),
})

type AddAddressFormValues = z.infer<typeof addAddressSchema>

export function AddAddressDialog({
  open,
  onOpenChange,
  initialPhone,
  onAddressAdded,
}: AddAddressDialogProps) {
  const addAddressMutation = useAddAddress({
    onSuccess: (data) => {
      if (data.success && data.location) {
        onAddressAdded?.(data.location.id)
        onOpenChange(false)
      }
    },
  })

  const form = useForm<AddAddressFormValues>({
    resolver: zodResolver(addAddressSchema),
    defaultValues: {
      name: '',
      description: '',
      city: '',
      neighborhood: '',
      street: '',
      apartmentNumber: '',
    },
  })

  const { reset } = form
  const phone = initialPhone || ''

  const { data: customerData } = useQuery({
    queryKey: ['customer', phone],
    queryFn: () => getCustomerByPhone(phone),
    enabled: phone.length >= 8,
  })

  const customer = customerData?.customer

  useEffect(() => {
    if (!open) {
      reset({
        name: '',
        description: '',
        city: '',
        neighborhood: '',
        street: '',
        apartmentNumber: '',
      })
    }
  }, [open, initialPhone, reset])

  const onSubmit = (values: AddAddressFormValues) => {
    if (!customer && !values.name) return

    addAddressMutation.mutate({
      phone: initialPhone,
      name: customer ? undefined : values.name,
      location: {
        description: values.description,
        city: values.city,
        neighborhood: values.neighborhood,
        street: values.street,
        apartmentNumber: values.apartmentNumber,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة عنوان جديد</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (data) => console.log(data))}
            className="space-y-6 mt-4"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسمك *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="أدخل اسمك" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>وصف العنوان *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="منزل، مكتب، عمارة 5…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المدينة *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ادخل المدينة" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحي *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ادخل الحي" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الشارع *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ادخل اسم الشارع" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apartmentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الشقة (اختياري)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="اختياري" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg h-14 rounded-xl"
              disabled={addAddressMutation.isPending}
            >
              {addAddressMutation.isPending ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ العنوان'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
