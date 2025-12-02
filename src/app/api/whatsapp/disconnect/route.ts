import { NextResponse } from 'next/server'
import { disconnectWhatsApp } from '@/lib/whatsapp-client'

export async function POST() {
  try {
    await disconnectWhatsApp()

    return NextResponse.json({
      success: true,
      message: 'WhatsApp disconnected successfully',
    })
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect WhatsApp' },
      { status: 500 },
    )
  }
}
