import { Session } from '../models/Session'

/**
 * Get the first active (connected) WhatsApp session
 * @returns Session ID of the first active session, or null if none found
 */
export async function getFirstActiveSession(): Promise<string | null> {
  try {
    const session = await Session.findOne({ status: 'connected' })
      .sort({ lastConnected: -1 }) // Get most recently connected
      .select('sessionId')

    if (!session) {
      console.log('[getFirstActiveSession] No active sessions found')
      return null
    }

    console.log(`[getFirstActiveSession] Found active session: ${session.sessionId}`)
    return session.sessionId
  } catch (error) {
    console.error('[getFirstActiveSession] Error:', error)
    return null
  }
}
