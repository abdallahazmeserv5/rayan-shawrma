'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCustomerByPhone } from './customers.actions'
import { getStoreSettingsInternal } from './settings.actions'

interface QuickCheckoutItem {
  productId: string
  qty: number
}

interface QuickCheckoutData {
  phone: string
  locationId: string
  items: QuickCheckoutItem[]
}

export async function quickCheckout(data: QuickCheckoutData) {
  try {
    const payload = await getPayload({ config })

    // 1. Get customer by phone
    const customerResult = await getCustomerByPhone(data.phone)
    const customer = customerResult.customer

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      }
    }

    // 2. Validate location belongs to customer
    const customerLocations = Array.isArray(customer.locations) ? customer.locations : []
    const locationExists = customerLocations.some((loc) => {
      const location = typeof loc === 'object' ? loc : null
      return location?.id === data.locationId
    })

    if (!locationExists) {
      return {
        success: false,
        error: 'Invalid location selected',
      }
    }

    // 3. Fetch product prices (server-side validation)
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

    // 4. Get delivery fee from settings
    const settings = await getStoreSettingsInternal()
    if (!settings) {
      return {
        success: false,
        error: 'Failed to load store settings',
      }
    }

    const deliveryFee = settings.deliveryFee || 0

    // 5. Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const total = subtotal + deliveryFee

    // 6. Create order
    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: customer.id,
        phone: customer.phone,
        phone2: customer.phone2,
        location: data.locationId,
        items,
        subtotal,
        deliveryFee,
        total,
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        orderStatus: 'created',
      },
    })

    return {
      success: true,
      orderId: order.id,
    }
  } catch (error) {
    console.error('Quick checkout error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Quick checkout failed',
    }
  }
}
