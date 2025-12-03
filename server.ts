import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
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
  })

  // Start server
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running`)
  })
})
