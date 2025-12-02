import type { Server as SocketIOServer } from 'socket.io'

// Use Node.js global object to persist across module reloads
declare global {
  var __socketIOServer: SocketIOServer | undefined
}

/**
 * Sets the Socket.IO server instance
 * Called from server.ts during initialization
 */
export function setSocketIO(io: SocketIOServer): void {
  global.__socketIOServer = io
  console.log('✅ Socket.IO server instance registered globally')
}

/**
 * Gets the Socket.IO server instance
 * Used by API routes to emit events
 */
export function getSocketIO(): SocketIOServer | null {
  return global.__socketIOServer || null
}
