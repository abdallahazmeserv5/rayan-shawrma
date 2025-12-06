import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
} from '@whiskeysockets/baileys'
import { Session } from './models/Session'

/**
 * Custom Baileys auth state adapter that stores credentials in MongoDB
 * instead of the file system.
 */
export async function getMongoDBAuthState(
  sessionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  // Find or create the session document
  let session = await Session.findOne({ sessionId })

  if (!session) {
    // Create new session with initial credentials
    const creds = initAuthCreds()
    session = new Session({
      sessionId,
      creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
      keys: {},
      status: 'pending',
    })
    await session.save()
  }

  // Parse stored credentials
  const creds: AuthenticationCreds = JSON.parse(JSON.stringify(session.creds), BufferJSON.reviver)

  const saveCreds = async () => {
    await Session.updateOne(
      { sessionId },
      {
        $set: {
          creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
        },
      },
    )
  }

  // CRITICAL: Keep keys in memory to avoid race conditions
  // The old file-based system kept keys in memory and only wrote to disk
  // We need to do the same with MongoDB to prevent read/write race conditions
  const keysCache: Record<string, unknown> = { ...(session.keys || {}) }

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
        const data: { [id: string]: SignalDataTypeMap[T] } = {}

        // Read from in-memory cache (like the old file system did)
        for (const id of ids) {
          const key = `${type}-${id}`
          if (keysCache[key]) {
            try {
              data[id] = JSON.parse(JSON.stringify(keysCache[key]), BufferJSON.reviver)
            } catch {
              data[id] = keysCache[key] as SignalDataTypeMap[T]
            }
          }
        }

        return data
      },

      set: async (data: Record<string, Record<string, unknown>>) => {
        const updates: Record<string, unknown> = {}

        for (const category in data) {
          for (const id in data[category]) {
            const value = data[category][id]
            const key = `${category}-${id}`

            // Update in-memory cache IMMEDIATELY (critical!)
            if (value) {
              keysCache[key] = value
              updates[`keys.${key}`] = JSON.parse(JSON.stringify(value, BufferJSON.replacer))
            } else {
              delete keysCache[key]
              updates[`keys.${key}`] = undefined
            }
          }
        }

        // Save to MongoDB asynchronously (don't block on this)
        const setOps: Record<string, unknown> = {}
        const unsetOps: Record<string, string> = {}

        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined) {
            unsetOps[key] = ''
          } else {
            setOps[key] = value
          }
        }

        const updateQuery: Record<string, Record<string, unknown>> = {}
        if (Object.keys(setOps).length > 0) {
          updateQuery.$set = setOps
        }
        if (Object.keys(unsetOps).length > 0) {
          updateQuery.$unset = unsetOps
        }

        if (Object.keys(updateQuery).length > 0) {
          // Save to MongoDB in background - don't await to prevent blocking
          Session.updateOne({ sessionId }, updateQuery).catch((err) => {
            console.error(`[MongoAuthState] Error saving keys to MongoDB:`, err)
          })
        }
      },
    },
  }

  return { state, saveCreds }
}
