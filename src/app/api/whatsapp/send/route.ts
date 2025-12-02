import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp-client'
import { isValidPhoneNumber } from '@/lib/phone-formatter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message } = body

    // Validate input
    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone number and message are required' },
        { status: 400 },
      )
    }

    // Validate phone number
    if (!isValidPhoneNumber(to)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid phone number. Please use international format (e.g., +1234567890)',
        },
        { status: 400 },
      )
    }

    // Get user ID from session (if available)
    // For now, we'll pass undefined - you can integrate with Payload auth later
    const userId = undefined

    // Send message
    const result = await sendWhatsAppMessage(to, message, userId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        status: 'sent',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send message',
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error('Error in send message endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      },
      { status: 500 },
    )
  }
}
