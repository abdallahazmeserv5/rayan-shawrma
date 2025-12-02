'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCustomerByPhone, createCustomer } from './customers.actions'
import { createLocation } from './locations.actions'
import { getStoreSettingsInternal } from './settings.actions'

interface CheckoutItem {
  productId: string
  qty: number
}

interface CheckoutData {
  phone: string
  phone2?: string
  name?: string
  location?: {
    id?: string

    // NEW FIELDS (no lat/lng)
    description?: string
    city?: string
    neighborhood?: string
    street?: string
    apartmentNumber?: string
  }
  items: CheckoutItem[]
  paymentMethod: 'cod'
}

export async function checkout(data: CheckoutData) {
  try {
    const payload = await getPayload({ config })

    // -----------------------------
    // 1. Get or create customer
    // -----------------------------
    const customerResult = await getCustomerByPhone(data.phone)
    let customer = customerResult.customer

    if (!customer) {
      if (!data.name) {
        return { success: false, error: 'Customer name is required for new customers' }
      }

      const created = await createCustomer({
        name: data.name,
        phone: data.phone,
        phone2: data.phone2,
      })

      if (!created.success || !created.customer) {
        return { success: false, error: created.error || 'Failed to create customer' }
      }

      customer = created.customer
    }

    // -----------------------------
    // 2. Existing or new location
    // -----------------------------
    let locationId: string

    if (data.location?.id) {
      // Use existing customer location
      locationId = data.location.id
    } else if (
      data.location?.description &&
      data.location?.city &&
      data.location?.neighborhood &&
      data.location?.street
    ) {
      // Create new location
      const loc = await createLocation({
        customer: customer.id,
        description: data.location.description,
        city: data.location.city,
        neighborhood: data.location.neighborhood,
        street: data.location.street,
        apartmentNumber: data.location.apartmentNumber || '',
      })

      if (!loc.success || !loc.location) {
        return { success: false, error: loc.error || 'Failed to create location' }
      }

      locationId = loc.location.id
    } else {
      return { success: false, error: 'Location is required' }
    }

    // -----------------------------
    // 3. Load products + validate
    // -----------------------------
    const items = await Promise.all(
      data.items.map(async (item) => {
        const product = await payload.findByID({
          collection: 'products',
          id: item.productId,
        })

        if (!product.active) {
          throw new Error(`Product ${product.title} is not available`)
        }

        return {
          product: product.id,
          qty: item.qty,
          unitPrice: product.price,
          lineTotal: product.price * item.qty,
        }
      }),
    )

    // -----------------------------
    // 4. Settings / Delivery fee
    // -----------------------------
    const settings = await getStoreSettingsInternal()
    if (!settings) return { success: false, error: 'Failed to load store settings' }

    const deliveryFee = settings.deliveryFee || 0
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const total = subtotal + deliveryFee

    // -----------------------------
    // 5. Create Order
    // -----------------------------
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: customer.id,
        phone: data.phone,
        phone2: data.phone2,
        location: locationId,
        items,
        subtotal,
        deliveryFee,
        total,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'pending',
        orderStatus: 'created',
      },
    })

    return { success: true, orderId: order.id }
  } catch (error) {
    console.error('Checkout error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Checkout failed',
    }
  }
}
