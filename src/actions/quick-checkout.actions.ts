'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCustomerByPhone } from './customers.actions'
import { getStoreSettingsInternal } from './settings.actions'
import { sendMessageAPI, getActiveSession } from '@/services/send-message'

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
    console.log('customer', customer)
    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      }
    }

    // 2. Validate location belongs to customer
    const location = await payload.findByID({
      collection: 'locations',
      id: data.locationId,
    })

    // Handle customer field as either string ID or populated object
    const locationCustomerId =
      typeof location?.customer === 'string' ? location.customer : location?.customer?.id

    if (!location || locationCustomerId !== customer.id) {
      console.log('Location validation failed', {
        locationExists: !!location,
        locationCustomerId,
        customerId: customer.id,
      })
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

    // 7. Send WhatsApp confirmation message
    try {
      // Fetch full location details
      const fullLocation = await payload.findByID({
        collection: 'locations',
        id: data.locationId,
      })

      // Fetch product details for the message
      const productDetails = await Promise.all(
        data.items.map(async (item) => {
          const product = await payload.findByID({
            collection: 'products',
            id: item.productId,
          })
          return {
            title: product.title,
            qty: item.qty,
            price: product.price,
          }
        }),
      )

      // Build order items list in Arabic
      const itemsList = productDetails
        .map((item) => `• ${item.title} × ${item.qty} - ${(item.price * item.qty).toFixed(0)} ج.م`)
        .join('\n')

      // Build location address
      const locationAddress = `${fullLocation.street}, ${fullLocation.neighborhood}, ${fullLocation.city}${
        fullLocation.apartmentNumber ? `, شقة ${fullLocation.apartmentNumber}` : ''
      }`

      // Create confirmation message in Arabic
      const confirmationMessage = `🎉 شكراً لطلبك من عندنا!

📦 *تفاصيل الطلب:*
${itemsList}

💰 *الإجمالي الفرعي:* ${subtotal.toFixed(0)} ج.م
🚚 *رسوم التوصيل:* ${deliveryFee.toFixed(0)} ج.م
💵 *المجموع الكلي:* ${total.toFixed(0)} ج.م

📍 *عنوان التوصيل:*
${locationAddress}

⏰ سيصلك طلبك خلال *30 دقيقة*

🙏 نشكرك على ثقتك بنا!`

      // Send WhatsApp message
      const activeSession = await getActiveSession()

      if (!activeSession) {
        console.error('No active WhatsApp session found for order confirmation')
        console.error('Order created successfully, but WhatsApp message could not be sent')
        // Order is still created successfully, just no WhatsApp message sent
      } else {
        console.log(`Sending order confirmation via session: ${activeSession}`)
        await sendMessageAPI({
          to: customer.phone,
          text: confirmationMessage,
          sessionId: activeSession,
        })
      }
    } catch (messageError) {
      // Log error but don't fail the order
      console.error('Failed to send WhatsApp confirmation:', messageError)
    }

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
