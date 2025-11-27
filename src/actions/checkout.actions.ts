'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCustomerByPhone, createCustomer } from './customers.actions'
import { createLocation } from './locations.actions'
import { getStoreSettingsInternal } from './settings.actions'
// import { MyFatoorahClient } from '@/lib/myfatoorah'

interface CheckoutItem {
  productId: string
  qty: number
}

interface CheckoutData {
  phone: string
  phone2?: string
  name?: string
  location?: {
    id?: string // Existing location ID
    description?: string // New location
    lat?: number
    lng?: number
  }
  items: CheckoutItem[]
  paymentMethod: 'cod' // | 'myfatoorah'
}

export async function checkout(data: CheckoutData) {
  try {
    const payload = await getPayload({ config })

    // 1. Get or create customer
    const customerResult = await getCustomerByPhone(data.phone)
    let customer = customerResult.customer

    if (!customer) {
      if (!data.name) {
        return {
          success: false,
          error: 'Customer name is required for new customers',
        }
      }

      const createResult = await createCustomer({
        name: data.name,
        phone: data.phone,
        phone2: data.phone2,
      })

      if (!createResult.success || !createResult.customer) {
        return {
          success: false,
          error: createResult.error || 'Failed to create customer',
        }
      }

      customer = createResult.customer
    }

    // 2. Get or create location
    let locationId: string

    if (data.location?.id) {
      // Use existing location
      locationId = data.location.id
    } else if (data.location?.description && data.location?.lat && data.location?.lng) {
      // Create new location
      const locationResult = await createLocation({
        customer: customer.id,
        description: data.location.description,
        lat: data.location.lat,
        lng: data.location.lng,
      })

      if (!locationResult.success || !locationResult.location) {
        return {
          success: false,
          error: locationResult.error || 'Failed to create location',
        }
      }

      locationId = locationResult.location.id
    } else {
      return {
        success: false,
        error: 'Location is required',
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

    // 7. If MyFatoorah, initiate payment
    // COMMENTED OUT - MyFatoorah payment temporarily disabled
    /*
    if (data.paymentMethod === 'myfatoorah') {
      if (!settings.myFatoorahApiKey) {
        return {
          success: false,
          error: 'MyFatoorah is not configured',
        }
      }

      const myFatoorah = new MyFatoorahClient(
        settings.myFatoorahApiKey,
        settings.myFatoorahTestMode || false,
      )

      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

      try {
        const payment = await myFatoorah.initiatePayment({
          amount: total,
          currency: settings.currency || 'KWD',
          customerName: customer.name,
          customerPhone: customer.phone,
          callbackUrl: settings.myFatoorahCallbackUrl || `${baseUrl}/payment/success`,
          errorUrl: settings.myFatoorahErrorUrl || `${baseUrl}/payment/error`,
          orderReference: order.id,
        })

        // Create payment record
        await payload.create({
          collection: 'payment-records',
          data: {
            order: order.id,
            gateway: 'myfatoorah',
            invoiceId: payment.invoiceId,
            status: 'pending',
            amount: total,
            payload: payment,
          },
        })

        return {
          success: true,
          orderId: order.id,
          paymentUrl: payment.paymentUrl,
        }
      } catch (paymentError) {
        console.error('Payment initiation error:', paymentError)
        return {
          success: false,
          error: 'Failed to initiate payment',
          orderId: order.id,
        }
      }
    }
    */

    // COD order - success
    return {
      success: true,
      orderId: order.id,
    }
  } catch (error) {
    console.error('Checkout error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Checkout failed',
    }
  }
}
