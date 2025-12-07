/**
 * WhatsApp API Client
 * Communicates with the Express WhatsApp service
 */

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

export interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface SessionStatus {
  sessionId: string
  status: string
}

export interface QRCodeResponse {
  qr?: string
  error?: string
}

/**
 * Sends a WhatsApp message via the Express service
 */
export async function sendWhatsAppMessage(
  sessionId: string,
  to: string,
  text: string,
): Promise<SendMessageResult> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, to, text }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send message',
      }
    }

    return {
      success: true,
      messageId: data.messageId,
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Starts a WhatsApp session
 */
export async function startWhatsAppSession(
  sessionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to start session',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error starting WhatsApp session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Gets the QR code for a session
 */
export async function getSessionQRCode(sessionId: string): Promise<QRCodeResponse> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/${sessionId}/qr`)

    if (!response.ok) {
      const data = await response.json()
      return {
        error: data.error || 'QR code not available',
      }
    }

    const data = await response.json()
    return { qr: data.qr }
  } catch (error) {
    console.error('Error getting QR code:', error)
    return {
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Gets the status of a session
 */
export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/${sessionId}/status`)
    const data = await response.json()

    return {
      sessionId,
      status: data.status || 'unknown',
    }
  } catch (error) {
    console.error('Error getting session status:', error)
    return {
      sessionId,
      status: 'error',
    }
  }
}

/**
 * Gets all active sessions
 */
export async function getAllSessions(): Promise<SessionStatus[]> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions`)
    const data = await response.json()

    return data.sessions || []
  } catch (error) {
    console.error('Error getting sessions:', error)
    return []
  }
}

/**
 * Deletes a WhatsApp session
 */
export async function deleteWhatsAppSession(
  sessionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/${sessionId}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to delete session',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting WhatsApp session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Sends bulk messages
 */
export async function sendBulkMessages(
  sessionId: string,
  recipients: string[],
  text: string,
  delayMs?: number,
): Promise<{ success: boolean; results?: { sent: number; failed: number }; error?: string }> {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/message/send-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, recipients, text, delayMs }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send bulk messages',
      }
    }

    return {
      success: true,
      results: data.results,
    }
  } catch (error) {
    console.error('Error sending bulk messages:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}
