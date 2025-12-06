import makeWASocket, { ConnectionState, DisconnectReason, WASocket } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { SessionManager } from './SessionManager'
import pino from 'pino'
import { MessageContent } from './types/MessageContent'

export class WhatsAppClient {
  private socket: WASocket | null = null
  private sessionManager: SessionManager
  private sessionId: string
  private qrCallback?: (qr: string) => void
  private statusCallback?: (status: string) => void
  private messageCallback?: (msg: any) => void

  constructor(
    sessionId: string,
    sessionManager: SessionManager,
    qrCallback?: (qr: string) => void,
    statusCallback?: (status: string) => void,
    messageCallback?: (msg: any) => void,
  ) {
    this.sessionId = sessionId
    this.sessionManager = sessionManager
    this.qrCallback = qrCallback
    this.statusCallback = statusCallback
    this.messageCallback = messageCallback
  }

  async initialize() {
    const { state, saveCreds } = await this.sessionManager.getAuthState(this.sessionId)

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
    })

    this.socket.ev.on('creds.update', saveCreds)

    this.socket.ev.on('messages.upsert', async (m) => {
      if (m.type === 'notify' && this.messageCallback) {
        for (const msg of m.messages) {
          if (!msg.key.fromMe) {
            this.messageCallback(msg)
          }
        }
      }
    })

    this.socket.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update

      if (qr && this.qrCallback) {
        this.qrCallback(qr)
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
        console.log(
          `Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`,
        )
        if (this.statusCallback) this.statusCallback('disconnected')

        await this.sessionManager.updateSessionStatus(this.sessionId, 'disconnected')

        if (shouldReconnect) {
          this.initialize()
        }
      } else if (connection === 'open') {
        console.log(`Session ${this.sessionId} opened successfully`)
        if (this.statusCallback) this.statusCallback('connected')

        const phoneNumber = this.socket?.user?.id?.split(':')[0] || null
        const name = this.socket?.user?.name || null

        await this.sessionManager.updateSessionStatus(
          this.sessionId,
          'connected',
          phoneNumber || undefined,
          name || undefined,
        )
      }
    })
  }

  async sendMessage(to: string, content: string | MessageContent, maxRetries = 3) {
    if (!this.socket) {
      throw new Error('Socket not initialized')
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

    // Special handling for LID accounts with plain text - bypass MessageContent
    if (typeof content === 'string' && jid.includes('@lid')) {
      console.log(`[WhatsAppClient] Sending text to LID account using direct method`)
      try {
        await this.socket.sendMessage(jid, { text: content })
        console.log(`[WhatsAppClient] ✓ TEXT sent to ${jid}`)
        return
      } catch (error: any) {
        console.error(`[WhatsAppClient] ✗ Error sending to LID account:`, error.message)
        throw error
      }
    }

    // Backwards compatibility: string = text message
    const messageContent: MessageContent =
      typeof content === 'string' ? { type: 'text', text: content } : content

    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Build message payload based on type
        let messagePayload: any

        switch (messageContent.type) {
          case 'text':
            messagePayload = { text: messageContent.text }
            break

          case 'image':
            messagePayload = {
              image: { url: messageContent.url },
              caption: messageContent.caption,
            }
            break

          case 'video':
            messagePayload = {
              video: { url: messageContent.url },
              caption: messageContent.caption,
            }
            break

          case 'audio':
            messagePayload = {
              audio: { url: messageContent.url },
              ptt: messageContent.ptt ?? false,
            }
            break

          case 'document':
            messagePayload = {
              document: { url: messageContent.url },
              fileName: messageContent.fileName,
              mimetype: messageContent.mimetype || 'application/pdf',
            }
            break

          case 'location':
            messagePayload = {
              location: {
                degreesLatitude: messageContent.latitude,
                degreesLongitude: messageContent.longitude,
                name: messageContent.name,
                address: messageContent.address,
              },
            }
            break

          case 'contact':
            messagePayload = {
              contacts: {
                displayName: 'Contact',
                contacts: [{ vcard: messageContent.vcard }],
              },
            }
            break

          case 'poll':
            messagePayload = {
              poll: {
                name: messageContent.name,
                values: messageContent.options,
                selectableCount: messageContent.selectableCount || 1,
              },
            }
            break

          case 'buttons':
            messagePayload = {
              text: messageContent.text,
              footer: messageContent.footer,
              buttons: messageContent.buttons.map((btn, idx) => ({
                buttonId: btn.id,
                buttonText: { displayText: btn.text },
                type: 1,
              })),
            }
            break

          case 'list':
            messagePayload = {
              text: messageContent.text,
              footer: messageContent.footer,
              buttonText: messageContent.buttonText,
              sections: messageContent.sections,
            }
            break

          default:
            throw new Error(`Unsupported message type: ${(messageContent as any).type}`)
        }

        await this.socket.sendMessage(jid, messagePayload)

        const typeLabel = messageContent.type.toUpperCase()
        if (attempt > 1) {
          console.log(
            `[WhatsAppClient] ✓ ${typeLabel} sent to ${jid} (after ${attempt - 1} retries)`,
          )
        } else {
          console.log(`[WhatsAppClient] ✓ ${typeLabel} sent to ${jid}`)
        }
        return
      } catch (error: any) {
        lastError = error
        const isSessionError =
          error.message?.includes('SessionError') || error.message?.includes('No sessions')

        if (isSessionError && attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 500
          console.log(
            `[WhatsAppClient] Attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs}ms...`,
          )
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }

        if (isSessionError) {
          console.error(`[WhatsAppClient] ✗ All ${maxRetries} attempts failed for ${jid}`)
          throw new Error(
            `Cannot send message to ${to}: Encryption session not established after ${maxRetries} attempts.`,
          )
        }

        throw error
      }
    }

    throw lastError || new Error('Unknown error')
  }

  getSocket(): WASocket | null {
    return this.socket
  }

  async destroy() {
    if (this.socket) {
      try {
        this.socket.end(undefined)
      } catch (error) {
        console.error('Error closing socket:', error)
      }
      this.socket = null
    }
  }
}
