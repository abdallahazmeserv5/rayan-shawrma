import { NextResponse } from 'next/server'
import { getWhatsAppClient, resetWhatsApp } from '@/lib/whatsapp-client'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const forceReset = body.forceReset === true

    // If force reset is requested, clear existing session first
    if (forceReset) {
      console.log('🔄 Resetting WhatsApp session before connecting...')
      await resetWhatsApp()
    }

    const client = getWhatsAppClient()

    if (client && !forceReset) {
      return NextResponse.json({
        success: true,
        message: 'WhatsApp is already connected',
      })
    }

    // The actual initialization happens via Socket.IO events in server.ts
    // This endpoint just confirms the request was received
    console.log('✅ Connect request received, initialization will be triggered via Socket.IO')

    return NextResponse.json({
      success: true,
      message: 'WhatsApp connection initiated. Please scan the QR code.',
    })
  } catch (error) {
    console.error('Error connecting WhatsApp:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initiate WhatsApp connection' },
      { status: 500 },
    )
  }
}
