import { AuthenticationState } from '@whiskeysockets/baileys'
import { getMongoDBAuthState } from './MongoAuthState'
import { Session } from './models/Session'

export class SessionManager {
  constructor() {}

  async getAuthState(
    sessionId: string,
  ): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
    const { state, saveCreds } = await getMongoDBAuthState(sessionId)
    return { state, saveCreds }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await Session.deleteOne({ sessionId })
  }

  async updateSessionStatus(
    sessionId: string,
    status: 'connected' | 'disconnected' | 'pending',
    phoneNumber?: string,
    name?: string,
  ): Promise<void> {
    const update: Record<string, string | Date> = { status }

    if (status === 'connected') {
      update.lastConnected = new Date()
    }

    if (phoneNumber) {
      update.phoneNumber = phoneNumber
    }

    if (name) {
      update.name = name
    }

    await Session.updateOne({ sessionId }, { $set: update })
  }

  async getAllSessions() {
    return Session.find().sort({ createdAt: -1 })
  }

  async getSession(sessionId: string) {
    return Session.findOne({ sessionId })
  }
}
