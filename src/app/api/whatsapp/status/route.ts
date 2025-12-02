import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Get session from database
    const sessions = await payload.find({
      collection: 'whatsapp-sessions' as any,
      where: {
        sessionId: {
          equals: 'global_session',
        },
      },
      limit: 1,
    })

    if (sessions.docs.length === 0) {
      return NextResponse.json({
        status: 'disconnected',
        phoneNumber: null,
        qrCode: null,
      })
    }

    const session = sessions.docs[0] as any

    return NextResponse.json({
      status: session.status || 'disconnected',
      phoneNumber: session.phoneNumber || null,
      qrCode: session.qrCode || null,
    })
  } catch (error) {
    console.error('Error getting WhatsApp status:', error)
    return NextResponse.json({ error: 'Failed to get WhatsApp status' }, { status: 500 })
  }
}
