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

  async sendMessage(to: string, content: string | MessageContent, maxRetries = 5) {
    if (!this.socket) {
      throw new Error('Socket not initialized')
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

    // Special handling for LID accounts (WhatsApp Channels)
    // Note: Baileys has LIMITED support for @lid accounts due to tctoken authentication issues
    if (typeof content === 'string' && jid.includes('@lid')) {
      console.log(`[WhatsAppClient] ⚠️  Attempting to send to WhatsApp Channel (LID): ${jid}`)
      console.log(
        `[WhatsAppClient] Note: Channels have limited Baileys support. Message may not be delivered.`,
      )

      // Try sending but don't fail the entire flow if it doesn't work
      try {
        await this.socket.sendMessage(jid, { text: content })
        console.log(`[WhatsAppClient] ✓ TEXT sent to LID account ${jid}`)
        return
      } catch (error: any) {
        // Known Baileys limitation with tctoken for channels
        if (error.message?.includes('tctoken')) {
          console.error(
            `[WhatsAppClient] ✗ Cannot send to WhatsApp Channel ${jid}: Baileys does not fully support @lid accounts`,
          )
          console.error(
            `[WhatsAppClient] Recommendation: Use regular WhatsApp accounts (@s.whatsapp.net) for flows`,
          )
          // Don't throw - just log and return to prevent flow failure
          return
        }
        // For other errors, throw them
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
            // Try native flow interactive message with quick_reply buttons
            const buttonsArray = messageContent.buttons.map((btn) => ({
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: btn.text,
                id: btn.id,
              }),
            }))

            const nativeButtonPayload = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                  },
                  interactiveMessage: {
                    body: {
                      text: messageContent.text,
                    },
                    footer: messageContent.footer
                      ? {
                          text: messageContent.footer,
                        }
                      : undefined,
                    nativeFlowMessage: {
                      buttons: buttonsArray,
                    },
                  },
                },
              },
            }

            // Try native flow, fall back to simple text if it fails
            try {
              messagePayload = nativeButtonPayload
              console.log(`[WhatsAppClient] Attempting native flow buttons for ${jid}`)
            } catch (nativeError: any) {
              console.warn(
                `[WhatsAppClient] ⚠️ Native flow buttons failed, using text fallback:`,
                nativeError.message,
              )
              // Fallback: Simple text with numbered options
              let fallbackText = messageContent.text + '\n\n'
              messageContent.buttons.forEach((btn, idx) => {
                fallbackText += `${idx + 1}. ${btn.text}\n`
              })
              if (messageContent.footer) {
                fallbackText += `\n_${messageContent.footer}_`
              }
              messagePayload = { text: fallbackText }
            }
            break

          case 'list':
            // Try native flow interactive message with single_select list
            const nativeListPayload = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                  },
                  interactiveMessage: {
                    body: {
                      text: messageContent.text,
                    },
                    footer: messageContent.footer
                      ? {
                          text: messageContent.footer,
                        }
                      : undefined,
                    nativeFlowMessage: {
                      buttons: [
                        {
                          name: 'single_select',
                          buttonParamsJson: JSON.stringify({
                            title: messageContent.buttonText || 'Menu',
                            sections: messageContent.sections,
                          }),
                        },
                      ],
                    },
                  },
                },
              },
            }

            // Try native flow, fall back to simple text menu if it fails
            try {
              messagePayload = nativeListPayload
              console.log(`[WhatsAppClient] Attempting native flow list for ${jid}`)
            } catch (nativeError: any) {
              console.warn(
                `[WhatsAppClient] ⚠️ Native flow list failed, using text fallback:`,
                nativeError.message,
              )
              // Fallback: Simple text menu with sections
              let fallbackText = messageContent.text + '\n\n'
              let optionNumber = 1
              messageContent.sections.forEach((section) => {
                fallbackText += `*${section.title}*\n`
                section.rows.forEach((row) => {
                  fallbackText += `${optionNumber}. ${row.title}`
                  if (row.description) {
                    fallbackText += ` - ${row.description}`
                  }
                  fallbackText += '\n'
                  optionNumber++
                })
                fallbackText += '\n'
              })
              if (messageContent.footer) {
                fallbackText += `_${messageContent.footer}_`
              }
              messagePayload = { text: fallbackText }
            }
            break

          default:
            throw new Error(`Unsupported message type: ${(messageContent as any).type}`)
        }

        // Log outgoing message for debugging
        console.log(
          `[WhatsAppClient] Sending ${messageContent.type} to ${jid}`,
          messageContent.type === 'list' || messageContent.type === 'buttons'
            ? JSON.stringify(messagePayload, null, 2).substring(0, 500) + '...'
            : '',
        )

        try {
          await this.socket.sendMessage(jid, messagePayload)
        } catch (sendError: any) {
          // For buttons/lists, try fallback to simple text if native flow fails
          if (messageContent.type === 'buttons' || messageContent.type === 'list') {
            console.error(
              `[WhatsAppClient] ❌ Native flow ${messageContent.type} failed:`,
              sendError.message,
            )
            console.log(`[WhatsAppClient] 🔄 Retrying with text fallback...`)

            // Build fallback text
            let fallbackText = ''
            if (messageContent.type === 'buttons') {
              fallbackText = messageContent.text + '\n\n'
              messageContent.buttons.forEach((btn: any, idx: number) => {
                fallbackText += `${idx + 1}. ${btn.text}\n`
              })
              if (messageContent.footer) {
                fallbackText += `\n_${messageContent.footer}_`
              }
            } else if (messageContent.type === 'list') {
              fallbackText = messageContent.text + '\n\n'
              let optionNumber = 1
              messageContent.sections.forEach((section: any) => {
                fallbackText += `*${section.title}*\n`
                section.rows.forEach((row: any) => {
                  fallbackText += `${optionNumber}. ${row.title}`
                  if (row.description) {
                    fallbackText += ` - ${row.description}`
                  }
                  fallbackText += '\n'
                  optionNumber++
                })
                fallbackText += '\n'
              })
              if (messageContent.footer) {
                fallbackText += `_${messageContent.footer}_`
              }
            }

            // Send fallback text
            await this.socket.sendMessage(jid, { text: fallbackText })
            console.log(`[WhatsAppClient] ✓ Fallback text sent successfully`)
            return
          }

          // For other message types, throw the error
          console.error(
            `[WhatsAppClient] ❌ Failed to send ${messageContent.type} message:`,
            sendError.message,
          )
          console.error(`[WhatsAppClient] Error details:`, sendError)
          throw sendError
        }

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
          const delayMs = Math.pow(2, attempt - 1) * 1000 // Increased from 500ms to 1000ms base
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
