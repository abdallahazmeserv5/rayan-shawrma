import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Gets or creates the Socket.io client instance
 */
export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
    socket = io(url, {
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('✅ Socket.io connected')
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error)
    })
  }

  return socket
}

/**
 * Disconnects the Socket.io client
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Event type definitions for type safety
export interface WhatsAppQREvent {
  qrCode: string
}

export interface WhatsAppConnectedEvent {
  phoneNumber: string
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WhatsAppDisconnectedEvent {}
