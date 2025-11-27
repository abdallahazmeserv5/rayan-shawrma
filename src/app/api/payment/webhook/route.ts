import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { MyFatoorahClient } from '@/lib/myfatoorah'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Get store settings
    const settings = await payload.findGlobal({
      slug: 'store-settings',
    })

    if (!settings.myFatoorahApiKey) {
      return NextResponse.json({ error: 'MyFatoorah not configured' }, { status: 500 })
    }

    const body = await request.json()

    // Verify webhook signature
    const signature = request.headers.get('X-MyFatoorah-Signature') || ''
    const myFatoorah = new MyFatoorahClient(
      settings.myFatoorahApiKey,
      settings.myFatoorahTestMode || false,
    )

    const isValid = myFatoorah.verifyWebhookSignature(body, signature)

    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Extract payment info from webhook
    const { Data } = body

    if (!Data) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const { InvoiceId, InvoiceStatus, InvoiceReference } = Data

    // Find payment record by invoice ID
    const { docs: paymentRecords } = await payload.find({
      collection: 'payment-records',
      where: {
        invoiceId: {
          equals: InvoiceId?.toString(),
        },
      },
      limit: 1,
    })

    const paymentRecord = paymentRecords[0]

    if (!paymentRecord) {
      console.error('Payment record not found for invoice:', InvoiceId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Map MyFatoorah status to our status
    let paymentStatus: 'pending' | 'success' | 'failed' | 'cancelled' = 'pending'
    let orderPaymentStatus: 'pending' | 'paid' | 'failed' = 'pending'

    if (InvoiceStatus === 'Paid') {
      paymentStatus = 'success'
      orderPaymentStatus = 'paid'
    } else if (InvoiceStatus === 'Failed' || InvoiceStatus === 'Expired') {
      paymentStatus = 'failed'
      orderPaymentStatus = 'failed'
    } else if (InvoiceStatus === 'Cancelled') {
      paymentStatus = 'cancelled'
      orderPaymentStatus = 'failed'
    }

    // Update payment record
    await payload.update({
      collection: 'payment-records',
      id: paymentRecord.id,
      data: {
        status: paymentStatus,
        payload: body,
      },
    })

    // Update order payment status
    const orderId =
      typeof paymentRecord.order === 'string' ? paymentRecord.order : paymentRecord.order.id

    await payload.update({
      collection: 'orders',
      id: orderId,
      data: {
        paymentStatus: orderPaymentStatus,
      },
    })

    // TODO: Send WhatsApp notification if payment successful
    // You can integrate with your existing WhatsApp service here
    if (orderPaymentStatus === 'paid') {
      console.log(`Order ${orderId} paid successfully - send WhatsApp notification`)
      // Example: await sendWhatsAppNotification(orderId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 },
    )
  }
}
