import { WhatsAppClient } from './WhatsAppClient'
import { SessionManager } from './SessionManager'
import { FlowExecutor } from './services/FlowExecutor'
import { MessageContent } from './types/MessageContent'

export class WhatsAppManager {
  private clients: Map<string, WhatsAppClient> = new Map()
  private sessionManager: SessionManager
  private flowExecutor: FlowExecutor
  private autoReplyService?: any

  constructor() {
    this.sessionManager = new SessionManager()
    this.flowExecutor = new FlowExecutor(this)
  }

  setAutoReplyService(service: any) {
    this.autoReplyService = service
    console.log('✅ Auto-reply service connected to WhatsApp Manager')
  }

  async startSession(
    sessionId: string,
    qrCallback?: (qr: string) => void,
    statusCallback?: (status: string) => void,
  ) {
    // If session exists, check if it's connected
    if (this.clients.has(sessionId)) {
      const existingClient = this.clients.get(sessionId)
      const socket = existingClient?.getSocket()

      // If already connected, don't create a new session
      if (socket && socket.user && socket.user.id) {
        console.log(`Session ${sessionId} is already connected`)
        if (statusCallback) statusCallback('connected')
        return
      }

      // Session exists but not connected - delete it and create a new one
      console.log(`Session ${sessionId} exists but not connected, restarting...`)
      try {
        await existingClient?.destroy()
      } catch (e) {
        console.error('Error destroying old session:', e)
      }
      this.clients.delete(sessionId)
    }

    const client = new WhatsAppClient(
      sessionId,
      this.sessionManager,
      qrCallback,
      statusCallback,
      (msg) => {
        this.flowExecutor.handleIncomingMessage(
          sessionId,
          msg.key.remoteJid || '',
          msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            '',
        )

        // Call auto-reply service if configured
        if (this.autoReplyService) {
          const from = msg.key.remoteJid || ''
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            ''

          console.log(`\n🤖 ===== Auto-reply triggered =====`)
          console.log(`📥 Message from ${from} on session: ${sessionId}`)

          this.autoReplyService.handleIncomingMessage(from, text, sessionId).catch((err: any) => {
            console.error('Auto-reply error:', err)
          })
        }
      },
    )

    await client.initialize()
    this.clients.set(sessionId, client)
  }

  getClient(sessionId: string): WhatsAppClient | undefined {
    return this.clients.get(sessionId)
  }

  async sendMessage(sessionId: string, to: string, content: string | MessageContent) {
    const client = this.clients.get(sessionId)
    if (!client) {
      throw new Error(`Session ${sessionId} not found`)
    }
    await client.sendMessage(to, content)
  }

  async deleteSession(sessionId: string) {
    const client = this.clients.get(sessionId)
    if (!client) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Close the connection
    await client.destroy()

    // Remove from clients map
    this.clients.delete(sessionId)

    // Delete session files
    await this.sessionManager.deleteSession(sessionId)

    console.log(`Session ${sessionId} deleted successfully`)
  }

  setFlowExecutor(executor: FlowExecutor) {
    this.flowExecutor = executor
  }

  /**
   * Restore all previously connected sessions from MongoDB
   * Called on server startup to automatically reconnect sessions
   */
  async restoreAllSessions() {
    try {
      const { Session } = await import('./models/Session')
      // Find all sessions that were previously connected
      const sessions = await Session.find({
        status: { $in: ['connected', 'disconnected'] },
      })

      console.log(`[WhatsAppManager] Found ${sessions.length} sessions to restore`)

      for (const session of sessions) {
        try {
          console.log(`[WhatsAppManager] Restoring session: ${session.sessionId}`)

          // Start the session without QR callback (will use stored credentials)
          await this.startSession(
            session.sessionId,
            undefined, // No QR callback - using stored creds
            (status) => {
              console.log(
                `[WhatsAppManager] Restored session ${session.sessionId} status: ${status}`,
              )
            },
          )
        } catch (error: any) {
          console.error(
            `[WhatsAppManager] Failed to restore session ${session.sessionId}:`,
            error.message,
          )
          // Continue with other sessions even if one fails
        }
      }

      console.log(`[WhatsAppManager] Session restoration complete`)
    } catch (error: any) {
      console.error(`[WhatsAppManager] Error during session restoration:`, error)
    }
  }

  async bulkSendMessage(
    sessionId: string,
    recipients: string[],
    text: string,
    delayMs: number = 2000,
  ): Promise<{ recipient: string; status: string; error?: string }[]> {
    const client = this.clients.get(sessionId)
    if (!client) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const results: { recipient: string; status: string; error?: string }[] = []

    for (const recipient of recipients) {
      const trimmedRecipient = recipient.trim()
      if (!trimmedRecipient) continue

      try {
        await client.sendMessage(trimmedRecipient, text)
        results.push({
          recipient: trimmedRecipient,
          status: 'success',
        })
      } catch (error: any) {
        results.push({
          recipient: trimmedRecipient,
          status: 'failed',
          error: error.message,
        })
      }

      // Add delay between messages
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    return results
  }

  async broadcastMessage(
    recipients: string[],
    text: string,
    delayMs: number = 2000,
  ): Promise<{ recipient: string; sessionId: string; status: string; error?: string }[]> {
    const results: {
      recipient: string
      sessionId: string
      status: string
      error?: string
    }[] = []

    for (const recipient of recipients) {
      const trimmedRecipient = recipient.trim()
      if (!trimmedRecipient) continue

      for (const [sessionId, client] of this.clients.entries()) {
        try {
          await client.sendMessage(trimmedRecipient, text)
          results.push({
            recipient: trimmedRecipient,
            sessionId,
            status: 'success',
          })
        } catch (error: any) {
          results.push({
            recipient: trimmedRecipient,
            sessionId,
            status: 'failed',
            error: error.message,
          })
        }

        // Add delay between messages
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return results
  }
}
