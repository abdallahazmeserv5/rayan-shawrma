import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type ConnectionState,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import QRCode from 'qrcode'
import type { Server as SocketIOServer } from 'socket.io'
import { getPayload } from 'payload'
import config from '@payload-config'
import { encrypt, decrypt } from './encryption'
import { formatPhoneForWhatsApp } from './phone-formatter'
import fs from 'fs'
import path from 'path'

// Global WhatsApp client instance
let whatsappClient: WASocket | null = null
let isInitializing = false

const logger = pino({ level: 'silent' }) // Set to 'debug' for debugging

// Directory to store auth state temporarily
const AUTH_DIR = path.join(process.cwd(), '.whatsapp-auth')

/**
 * Ensures the auth directory exists
 */
function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }
}

/**
 * Loads session from MongoDB and saves to file system
 */
async function loadSessionFromDB(): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const sessions = await payload.find({
      collection: 'whatsapp-sessions' as any,
      where: {
        sessionId: {
          equals: 'global_session',
        },
      },
      limit: 1,
    })

    if (sessions.docs.length > 0 && (sessions.docs[0] as any).sessionData) {
      const session = sessions.docs[0] as any
      const decryptedData = decrypt(session.sessionData as string)
      const authState = JSON.parse(decryptedData)

      // Save to file system for Baileys
      ensureAuthDir()
      const credsPath = path.join(AUTH_DIR, 'creds.json')
      fs.writeFileSync(credsPath, JSON.stringify(authState.creds))

      console.log('✅ Session loaded from database')
      return true
    }

    return false
  } catch (error) {
    console.error('Error loading session from DB:', error)
    return false
  }
}

/**
 * Saves session to MongoDB
 */
async function saveSessionToDB(authState: any, phoneNumber?: string) {
  try {
    const payload = await getPayload({ config })
    const sessionData = JSON.stringify(authState)
    const encryptedData = encrypt(sessionData)

    const sessions = await payload.find({
      collection: 'whatsapp-sessions' as any,
      where: {
        sessionId: {
          equals: 'global_session',
        },
      },
      limit: 1,
    })

    const updateData: any = {
      sessionData: encryptedData,
      status: 'connected',
      lastConnectedAt: new Date().toISOString(),
    }

    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber
    }

    if (sessions.docs.length > 0) {
      await payload.update({
        collection: 'whatsapp-sessions' as any,
        id: sessions.docs[0].id,
        data: updateData,
      })
    } else {
      await payload.create({
        collection: 'whatsapp-sessions' as any,
        data: {
          sessionId: 'global_session',
          ...updateData,
        },
      })
    }

    console.log('✅ Session saved to database')
  } catch (error) {
    console.error('Error saving session to DB:', error)
  }
}

/**
 * Updates session status in MongoDB
 */
async function updateSessionStatus(
  status: 'disconnected' | 'scanning' | 'connected',
  qrCode?: string | null,
) {
  try {
    const payload = await getPayload({ config })
    const sessions = await payload.find({
      collection: 'whatsapp-sessions' as any,
      where: {
        sessionId: {
          equals: 'global_session',
        },
      },
      limit: 1,
    })

    const updateData: any = { status }
    if (qrCode !== undefined) {
      updateData.qrCode = qrCode
    }

    if (sessions.docs.length > 0) {
      await payload.update({
        collection: 'whatsapp-sessions' as any,
        id: sessions.docs[0].id,
        data: updateData,
      })
    } else {
      await payload.create({
        collection: 'whatsapp-sessions' as any,
        data: {
          sessionId: 'global_session',
          ...updateData,
        },
      })
    }
  } catch (error) {
    console.error('Error updating session status:', error)
  }
}

/**
 * Initializes WhatsApp client with Baileys
 * @param io - Socket.io server instance for emitting events
 * @param forceReset - If true, resets existing session and forces new QR code generation
 */
export async function initWhatsApp(
  io?: SocketIOServer,
  forceReset: boolean = false,
): Promise<WASocket | null> {
  // If forcing reset, clear existing client and session
  if (forceReset) {
    console.log('🔄 Forcing WhatsApp reset for new session...')
    await resetWhatsApp()
    // After reset, whatsappClient should be null, so continue with initialization
    // Double-check that client is cleared
    if (whatsappClient) {
      console.warn('⚠️ Client still exists after reset, forcing null')
      whatsappClient = null
    }
    isInitializing = false // Ensure we can initialize again
  }

  if (whatsappClient && !forceReset) {
    console.log('WhatsApp client already initialized')
    // Check current status and emit it if we have a socket server
    if (io) {
      try {
        const payload = await getPayload({ config })
        const sessions = await payload.find({
          collection: 'whatsapp-sessions' as any,
          where: {
            sessionId: {
              equals: 'global_session',
            },
          },
          limit: 1,
        })

        if (sessions.docs.length > 0) {
          const session = sessions.docs[0] as any
          if (session.status === 'scanning' && session.qrCode) {
            console.log('📱 Emitting existing QR code')
            io.emit('whatsapp:qr', { qrCode: session.qrCode })
          } else if (session.status === 'connected' && session.phoneNumber) {
            console.log('✅ Emitting existing connection status')
            io.emit('whatsapp:connected', { phoneNumber: session.phoneNumber })
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error)
      }
    }
    return whatsappClient
  }

  if (isInitializing && !forceReset) {
    console.log('WhatsApp client is already initializing')
    return null
  }

  isInitializing = true
  console.log('🚀 Starting WhatsApp client initialization...')

  try {
    // Only load session from database if not forcing reset
    if (!forceReset) {
      await loadSessionFromDB()
    } else {
      console.log('⏭️ Skipping session load (force reset)')
    }

    ensureAuthDir()

    // Get latest Baileys version
    const { version } = await fetchLatestBaileysVersion()

    // Use multi-file auth state
    // eslint-disable-next-line
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    // Create WhatsApp socket
    console.log('🔌 Creating WhatsApp socket...')
    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: ['WhatsApp Dashboard', 'Chrome', '1.0.0'],
    })

    whatsappClient = sock
    console.log('✅ WhatsApp socket created, waiting for connection events...')

    // Handle connection updates
    sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update

      // Handle QR code (new or refreshed)
      if (qr) {
        console.log('📱 QR Code received, generating image...')
        try {
          const qrImage = await QRCode.toDataURL(qr)
          await updateSessionStatus('scanning', qrImage)

          if (io) {
            io.emit('whatsapp:qr', { qrCode: qrImage })
            console.log('✅ QR code emitted via Socket.io')
          }
        } catch (error) {
          console.error('Error generating QR code:', error)
        }
      }

      // Handle connection state
      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut

        console.log('Connection closed. Reconnecting:', shouldReconnect)

        await updateSessionStatus('disconnected', null)

        if (io) {
          io.emit('whatsapp:disconnected', {})
        }

        whatsappClient = null

        if (shouldReconnect) {
          // Reconnect after a delay
          setTimeout(() => {
            isInitializing = false
            initWhatsApp(io)
          }, 3000)
        } else {
          isInitializing = false
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connected successfully!')

        // Get phone number
        const phoneNumber = sock.user?.id?.split(':')[0] || ''
        const formattedPhone = phoneNumber ? `+${phoneNumber}` : ''

        await updateSessionStatus('connected', null)

        // Save session to database
        await saveSessionToDB(state, formattedPhone)

        if (io) {
          io.emit('whatsapp:connected', { phoneNumber: formattedPhone })
        }

        isInitializing = false
      }
    })

    // Handle credentials update
    sock.ev.on('creds.update', async () => {
      await saveCreds()
      // Save to database
      await saveSessionToDB(state)
    })

    return sock
  } catch (error) {
    console.error('Error initializing WhatsApp:', error)
    isInitializing = false
    whatsappClient = null

    // Emit error event if socket server is available
    if (io) {
      await updateSessionStatus('disconnected', null)
      io.emit('whatsapp:disconnected', {})
    }

    return null
  }
}

/**
 * Sends a WhatsApp message
 * @param to - Recipient phone number (with country code, e.g., +1234567890)
 * @param message - Message text
 * @param userId - ID of user sending the message
 * @returns Message ID and status
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  userId?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!whatsappClient) {
      return { success: false, error: 'WhatsApp client not initialized. Please connect first.' }
    }

    // Format phone number for WhatsApp
    const whatsappNumber = formatPhoneForWhatsApp(to)

    // Send message
    const _result = await whatsappClient.sendMessage(whatsappNumber, { text: message })

    // Log to database
    const payload = await getPayload({ config })
    const messageDoc = await payload.create({
      collection: 'whatsapp-messages' as any,
      data: {
        to,
        message,
        status: 'sent',
        sentBy: userId,
        sentAt: new Date().toISOString(),
      },
    })

    console.log(`✅ Message sent to ${to}`)

    return {
      success: true,
      messageId: messageDoc.id as string,
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)

    // Log failed message to database
    try {
      const payload = await getPayload({ config })
      await payload.create({
        collection: 'whatsapp-messages' as any,
        data: {
          to,
          message,
          status: 'failed',
          sentBy: userId,
          sentAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    } catch (dbError) {
      console.error('Error logging failed message:', dbError)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message',
    }
  }
}

/**
 * Resets WhatsApp client and clears session to force new QR code generation
 */
export async function resetWhatsApp(): Promise<void> {
  try {
    if (whatsappClient) {
      try {
        await whatsappClient.logout()
      } catch (error) {
        // Ignore logout errors if already disconnected
        console.log('Client already disconnected or error during logout:', error)
      }
      whatsappClient = null
    }

    // Reset initialization flag
    isInitializing = false

    // Clear session from database
    await updateSessionStatus('disconnected', null)

    // Clear auth directory to force new session
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    }

    console.log('✅ WhatsApp session reset - ready for new connection')
  } catch (error) {
    console.error('Error resetting WhatsApp:', error)
  }
}

/**
 * Disconnects WhatsApp client
 */
export async function disconnectWhatsApp(): Promise<void> {
  try {
    if (whatsappClient) {
      await whatsappClient.logout()
      whatsappClient = null
      console.log('✅ WhatsApp disconnected')
    }

    // Clear session from database
    await updateSessionStatus('disconnected', null)

    // Clear auth directory
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true })
    }
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error)
  }
}

/**
 * Gets the current WhatsApp client instance
 */
export function getWhatsAppClient(): WASocket | null {
  return whatsappClient
}

/**
 * Checks if WhatsApp is connected
 */
export function isWhatsAppConnected(): boolean {
  return whatsappClient !== null
}
