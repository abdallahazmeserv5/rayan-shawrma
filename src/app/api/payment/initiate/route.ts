import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MyFatoorahClient } from '@/lib/myfatoorah'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Get store settings for MyFatoorah credentials
    const settings = await payload.findGlobal({
      slug: 'store-settings',
    })

    if (!settings.myFatoorahApiKey) {
      return NextResponse.json({ error: 'MyFatoorah not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Fetch order
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 2,
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Initialize MyFatoorah client
    const myFatoorah = new MyFatoorahClient(
      settings.myFatoorahApiKey,
      settings.myFatoorahTestMode || false,
    )

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'

    // Initiate payment
    const payment = await myFatoorah.initiatePayment({
      amount: order.total,
      currency: settings.currency || 'KWD',
      customerName: typeof order.customer === 'object' ? order.customer.name : 'Customer',
      customerPhone: order.phone,
      callbackUrl:
        settings.myFatoorahCallbackUrl || `${baseUrl}/payment/success?orderId=${orderId}`,
      errorUrl: settings.myFatoorahErrorUrl || `${baseUrl}/payment/error?orderId=${orderId}`,
      orderReference: orderId,
    })

    // Create payment record
    await payload.create({
      collection: 'payment-records',
      data: {
        order: orderId,
        gateway: 'myfatoorah',
        invoiceId: payment.invoiceId,
        status: 'pending',
        amount: order.total,
        payload: payment,
      },
    })

    return NextResponse.json({
      success: true,
      paymentUrl: payment.paymentUrl,
      invoiceId: payment.invoiceId,
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initiation failed',
      },
      { status: 500 },
    )
  }
}
