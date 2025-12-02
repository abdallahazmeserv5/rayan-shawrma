import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { initWhatsApp } from './src/lib/whatsapp-client.js'
import { setSocketIO } from './src/lib/socket-io-server.js'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Create Socket.io server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_BACKEND_URL || '*',
      methods: ['GET', 'POST'],
    },
  })

  // Register Socket.IO server instance globally
  setSocketIO(io)

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id)
    console.log('📊 Total connected clients:', io.sockets.sockets.size)

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
    })

    // Test event to verify socket communication
    socket.on('test', (data) => {
      console.log('🧪 Test event received:', data)
      socket.emit('test-response', { received: true, data })
    })

    // Handle manual connection request from client
    socket.on('whatsapp:request-connect', async (data?: { forceReset?: boolean }) => {
      const forceReset = data?.forceReset || false
      console.log('📱 Client requested WhatsApp connection', forceReset ? '(with reset)' : '')
      console.log('📱 Socket ID:', socket.id)
      console.log('📱 Received data:', JSON.stringify(data))

      try {
        console.log('🚀 Calling initWhatsApp...')

        // Add timeout protection (10 seconds)
        const initPromise = initWhatsApp(io, forceReset)
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn('⏱️ WhatsApp initialization timeout (30s)')
            resolve(null)
          }, 30000)
        })

        const result = await Promise.race([initPromise, timeoutPromise])
        console.log('📦 initWhatsApp result:', result ? 'Socket created' : 'null or timeout')

        if (result) {
          console.log('✅ WhatsApp client initialized successfully')
          // Emit success confirmation
          socket.emit('whatsapp:init-started', { success: true })
        } else {
          console.warn('⚠️ WhatsApp client initialization returned null or timed out')
          socket.emit('whatsapp:error', {
            error: 'Initialization timeout or already initializing',
          })
        }
      } catch (error) {
        console.error('❌ Error initializing WhatsApp:', error)
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack')
        // Emit error to client
        socket.emit('whatsapp:error', {
          error: 'Failed to initialize WhatsApp client',
          details: error instanceof Error ? error.message : String(error),
        })
      }
    })
  })

  // Initialize WhatsApp client on server start
  initWhatsApp(io).then(() => {
    console.log('🚀 WhatsApp client initialization started')
  })

  // Start server
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running`)
  })
})
