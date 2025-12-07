import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { WhatsAppManager } from './WhatsAppManager'
import { connectToDatabase } from './config/database'
import { Flow, FlowExecution } from './models'
import qrcode from 'qrcode-terminal'
import { BulkMessageService } from './services/BulkMessageService'
import { BroadcastService } from './services/BroadcastService'
import { SenderManager } from './services/SenderManager'
import { CampaignManager } from './services/CampaignManager'
import { AutoReplyService } from './services/AutoReplyService'
import { createSenderRoutes } from './routes/senderRoutes'
import { createCampaignRoutes } from './routes/campaignRoutes'
import { createAutoReplyRoutes } from './routes/autoReplyRoutes'
import { createMessageWorker } from './workers/messageWorker'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration to allow Next.js app to communicate
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  }),
)
app.use(express.json({ limit: '500mb' }))
app.use(express.urlencoded({ limit: '500mb', extended: true }))

// In-memory storage
const qrCodes = new Map<string, string>()
const sessionStatuses = new Map<string, string>()

// Initialize the WhatsApp Manager
const manager = new WhatsAppManager()

// Initialize services
const bulkMessageService = new BulkMessageService(manager)
const broadcastService = new BroadcastService(manager)
const senderManager = new SenderManager(manager)
const campaignManager = new CampaignManager()
const autoReplyService = new AutoReplyService(manager)

// Initialize Routes
app.use('/api/senders', createSenderRoutes(senderManager))
app.use('/api/campaigns', createCampaignRoutes(campaignManager))
app.use('/api/auto-reply', createAutoReplyRoutes(autoReplyService))

// Initialize Database
connectToDatabase()
  .then(async () => {
    console.log('✅ MongoDB initialized successfully')

    // Connect auto-reply service to WhatsApp manager
    manager.setAutoReplyService(autoReplyService)

    // DISABLED: Auto-restore causes "conflict" errors when same account logs in multiple times
    // Restore WhatsApp sessions from MongoDB
    // console.log('🔄 Restoring WhatsApp sessions...')
    // await manager.restoreAllSessions()

    // Initialize Enterprise Features
    await senderManager.restoreAllSessions()

    // Initialize message worker (requires Redis)
    try {
      createMessageWorker(senderManager, campaignManager, manager)
      console.log('✅ Message worker initialized')
    } catch (error: any) {
      console.warn(
        '⚠️  Message worker not initialized (Redis may not be available):',
        error.message,
      )
      console.warn("   Campaigns will queue jobs but they won't be processed without Redis")
    }

    console.log('✅ Enterprise WhatsApp System Initialized')
  })
  .catch((error) => {
    console.error('Error initializing database:', error)
  })

app.post('/session/start', async (req, res) => {
  const { sessionId } = req.body
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' })
  }

  try {
    // Set initial status
    sessionStatuses.set(sessionId, 'connecting')

    await manager.startSession(
      sessionId,
      (qr) => {
        console.log(`QR Code for session ${sessionId}:`)
        qrcode.generate(qr, { small: true })
        qrCodes.set(sessionId, qr)
      },
      (status) => {
        console.log(`Session ${sessionId} status: ${status}`)
        sessionStatuses.set(sessionId, status)
      },
    )

    res.json({
      message: `Session ${sessionId} started. Check console for QR.`,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/session/:sessionId/qr', (req, res) => {
  const { sessionId } = req.params
  const qr = qrCodes.get(sessionId)

  if (!qr) {
    return res.status(404).json({ error: 'QR code not found or session connected' })
  }

  res.json({ qr })
})

app.get('/session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params

  // First check if we have a client for this session
  const client = manager.getClient(sessionId)
  if (client) {
    const socket = client.getSocket()
    if (socket) {
      // Check if socket is actually connected
      const isConnected = socket.user && socket.user.id
      if (isConnected) {
        sessionStatuses.set(sessionId, 'connected')
        return res.json({ status: 'connected' })
      }
    }
  }

  // Fall back to stored status
  const status = sessionStatuses.get(sessionId) || 'disconnected'
  res.json({ status })
})

app.get('/sessions', (req, res) => {
  const sessions = Array.from(sessionStatuses.entries()).map(([id, status]) => ({
    sessionId: id,
    status,
  }))
  res.json({ sessions })
})

// ============================================
// SESSION MANAGEMENT API (MongoDB-backed)
// ============================================

// List all sessions from database
app.get('/api/sessions', async (req, res) => {
  try {
    const { Session } = await import('./models/Session')
    const sessions = await Session.find().sort({ createdAt: -1 })

    // Enrich with live connection status
    const enrichedSessions = sessions.map((session) => {
      const client = manager.getClient(session.sessionId)
      let liveStatus = session.status

      if (client) {
        const socket = client.getSocket()
        if (socket?.user?.id) {
          liveStatus = 'connected'
        }
      }

      return {
        id: session._id,
        sessionId: session.sessionId,
        phoneNumber: session.phoneNumber,
        name: session.name,
        status: liveStatus,
        lastConnected: session.lastConnected,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }
    })

    res.json({ sessions: enrichedSessions })
  } catch (error: any) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get single session
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { Session } = await import('./models/Session')
    const session = await Session.findOne({ sessionId })

    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Check live status
    const client = manager.getClient(sessionId)
    let liveStatus = session.status
    if (client) {
      const socket = client.getSocket()
      if (socket?.user?.id) {
        liveStatus = 'connected'
      }
    }

    res.json({
      id: session._id,
      sessionId: session.sessionId,
      phoneNumber: session.phoneNumber,
      name: session.name,
      status: liveStatus,
      lastConnected: session.lastConnected,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })
  } catch (error: any) {
    console.error('Error fetching session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete session (from DB and disconnect)
app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    // Disconnect if connected
    const client = manager.getClient(sessionId)
    if (client) {
      await manager.deleteSession(sessionId)
    } else {
      // Just delete from database
      const { Session } = await import('./models/Session')
      await Session.deleteOne({ sessionId })
    }

    // Clean up in-memory storage
    qrCodes.delete(sessionId)
    sessionStatuses.delete(sessionId)

    res.json({ success: true, message: `Session ${sessionId} deleted` })
  } catch (error: any) {
    console.error('Error deleting session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Reconnect a disconnected session
app.post('/api/sessions/:sessionId/reconnect', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { Session } = await import('./models/Session')

    // Check if session exists in database
    const session = await Session.findOne({ sessionId })
    if (!session) {
      return res.status(404).json({ error: 'Session not found in database' })
    }

    // Check if already connected
    const existingClient = manager.getClient(sessionId)
    if (existingClient) {
      const socket = existingClient.getSocket()
      if (socket?.user?.id) {
        return res.json({ success: true, message: 'Session already connected', needsQr: false })
      }
    }

    // Start the session (will use existing creds from DB)
    sessionStatuses.set(sessionId, 'connecting')

    await manager.startSession(
      sessionId,
      (qr) => {
        console.log(`QR Code for session ${sessionId}:`)
        qrcode.generate(qr, { small: true })
        qrCodes.set(sessionId, qr)
      },
      (status) => {
        console.log(`Session ${sessionId} status: ${status}`)
        sessionStatuses.set(sessionId, status)
      },
    )

    res.json({
      success: true,
      message: `Reconnection initiated for session ${sessionId}`,
      needsQr: !session.creds || Object.keys(session.creds).length === 0,
    })
  } catch (error: any) {
    console.error('Error reconnecting session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get first active session (for order confirmations, etc.)
app.get('/session/active', async (req, res) => {
  try {
    const { getFirstActiveSession } = await import('./services/get-active-session')
    const sessionId = await getFirstActiveSession()

    if (!sessionId) {
      return res.status(404).json({
        error: 'No active session found',
        sessionId: null,
      })
    }

    res.json({ sessionId })
  } catch (error: any) {
    console.error('Error getting active session:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/message/send', async (req, res) => {
  const { sessionId, to, text } = req.body

  if (!sessionId || !to || !text) {
    return res.status(400).json({ error: 'sessionId, to, and text are required' })
  }

  try {
    await manager.sendMessage(sessionId, to, text)
    res.json({ message: 'Message sent successfully' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params

  try {
    await manager.deleteSession(sessionId)
    res.json({ message: `Session ${sessionId} deleted successfully` })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/message/send-bulk', async (req, res) => {
  const { sessionId, recipients, text, delayMs } = req.body

  if (!sessionId || !recipients || !text) {
    return res.status(400).json({ error: 'sessionId, recipients, and text are required' })
  }

  if (!Array.isArray(recipients)) {
    return res.status(400).json({ error: 'recipients must be an array' })
  }

  try {
    const results = await manager.bulkSendMessage(sessionId, recipients, text, delayMs)
    res.json({ results })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/message/send-all', async (req, res) => {
  const { recipients, text, delayMs } = req.body

  if (!recipients || !text) {
    return res.status(400).json({ error: 'recipients and text are required' })
  }

  if (!Array.isArray(recipients)) {
    return res.status(400).json({ error: 'recipients must be an array' })
  }

  try {
    const results = await manager.broadcastMessage(recipients, text, delayMs)
    res.json({ results })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Flow Management Endpoints
app.post('/api/flows', async (req, res) => {
  try {
    const { name, nodes, edges, triggerType, keywords, sessionId, isActive } = req.body

    // Check if sessionId is already assigned to another flow
    if (sessionId) {
      const existingFlow = await Flow.findOne({ sessionId })
      if (existingFlow) {
        return res.status(400).json({
          error: `Session "${sessionId}" is already assigned to flow "${existingFlow.name}". Each session can only be assigned to one flow.`,
        })
      }
    }

    const flow = new Flow({
      name,
      nodes,
      edges,
      triggerType,
      keywords,
      sessionId: sessionId || null,
      isActive: isActive !== undefined ? isActive : true,
    })

    await flow.save()
    res.json({ success: true, flow })
  } catch (error: any) {
    console.error('Error saving flow:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/flows', async (req, res) => {
  try {
    const flows = await Flow.find().sort({ createdAt: -1 })
    res.json(flows)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get available sessions (not assigned to other flows) for a specific flow
app.get('/api/flows/available-sessions', async (req, res) => {
  try {
    const { currentFlowId } = req.query

    // Get all sessions from the manager
    const sessions = Array.from(sessionStatuses.entries()).map(([id, status]) => ({
      sessionId: id,
      status,
    }))

    // Get all flows with assigned sessions
    const flowsWithSessions = await Flow.find({ sessionId: { $ne: null } }).select('sessionId name')

    // Build a map of session -> flow name
    const assignedSessions = new Map<string, string>()
    flowsWithSessions.forEach((flow) => {
      if (flow.sessionId && flow._id.toString() !== currentFlowId) {
        assignedSessions.set(flow.sessionId, flow.name)
      }
    })

    // Mark which sessions are available
    const sessionsWithAvailability = sessions.map((s) => ({
      ...s,
      isAvailable: !assignedSessions.has(s.sessionId),
      assignedToFlow: assignedSessions.get(s.sessionId) || null,
    }))

    res.json({ sessions: sessionsWithAvailability })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get a single flow by ID
app.get('/api/flows/:id', async (req, res) => {
  try {
    const { id } = req.params
    const flow = await Flow.findById(id)
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' })
    }
    res.json(flow)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Update a flow
app.put('/api/flows/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, nodes, edges, triggerType, keywords, sessionId, isActive } = req.body

    const flow = await Flow.findById(id)
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' })
    }

    // Check if sessionId is already assigned to another flow (not this one)
    if (sessionId) {
      const existingFlow = await Flow.findOne({
        sessionId,
        _id: { $ne: id },
      })
      if (existingFlow) {
        return res.status(400).json({
          error: `Session "${sessionId}" is already assigned to flow "${existingFlow.name}". Each session can only be assigned to one flow.`,
        })
      }
    }

    // Update fields
    flow.name = name
    flow.nodes = nodes
    flow.edges = edges
    flow.triggerType = triggerType
    flow.keywords = keywords
    flow.sessionId = sessionId || null
    if (isActive !== undefined) flow.isActive = isActive

    await flow.save()
    res.json({ success: true, flow })
  } catch (error: any) {
    console.error('Error updating flow:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update flow sessionId only (for session assignment from flows list)
app.patch('/api/flows/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { sessionId } = req.body

    const flow = await Flow.findById(id)
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' })
    }

    flow.sessionId = sessionId || null
    await flow.save()

    res.json({ success: true, flow })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.patch('/api/flows/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params

    const flow = await Flow.findById(id)
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' })
    }

    flow.isActive = !flow.isActive
    await flow.save()

    res.json({ success: true, flow })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/flows/:id/executions', async (req, res) => {
  try {
    const { id } = req.params
    const executions = await FlowExecution.find({ flowId: id })
      .populate('contactId')
      .sort({ startedAt: -1 })
      .limit(50)
    res.json(executions)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Delete a flow
app.delete('/api/flows/:id', async (req, res) => {
  try {
    const { id } = req.params

    const flow = await Flow.findById(id)
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' })
    }

    await Flow.findByIdAndDelete(id)
    res.json({ success: true, message: 'Flow deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting flow:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// BULK MESSAGING ENDPOINTS
// ============================================

app.post('/whatsapp/bulk-send', async (req, res) => {
  try {
    const { sessionId, numbers, message } = req.body

    // sessionId is now optional - if not provided, will use all connected sessions
    if (!numbers || !message) {
      return res.status(400).json({
        error:
          'numbers and message are required. sessionId is optional (will use all sessions if not provided)',
      })
    }

    if (!Array.isArray(numbers)) {
      return res.status(400).json({ error: 'numbers must be an array' })
    }

    const result = await bulkMessageService.sendBulkMessages({
      sessionId,
      numbers,
      message,
    })

    res.json(result)
  } catch (error: any) {
    console.error('Bulk send error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// BROADCAST LIST ENDPOINTS
// ============================================

app.post('/whatsapp/broadcast/create', async (req, res) => {
  try {
    const { sessionId, name, numbers } = req.body

    if (!sessionId || !name || !numbers) {
      return res.status(400).json({
        error: 'sessionId, name, and numbers are required',
      })
    }

    if (!Array.isArray(numbers)) {
      return res.status(400).json({ error: 'numbers must be an array' })
    }

    const result = await broadcastService.createBroadcastList({
      sessionId,
      name,
      numbers,
    })

    res.json(result)
  } catch (error: any) {
    console.error('Broadcast create error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/whatsapp/broadcast', async (req, res) => {
  try {
    const broadcasts = await broadcastService.getAllBroadcastLists()
    res.json({ broadcasts })
  } catch (error: any) {
    console.error('Get broadcasts error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/whatsapp/broadcast/:id', async (req, res) => {
  try {
    const { id } = req.params
    const broadcast = await broadcastService.getBroadcastListById(id)

    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast list not found' })
    }

    res.json(broadcast)
  } catch (error: any) {
    console.error('Get broadcast error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/whatsapp/broadcast/:id/send', async (req, res) => {
  try {
    const { id } = req.params
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: 'message is required' })
    }

    const result = await broadcastService.sendToBroadcastList(id, { message })
    res.json(result)
  } catch (error: any) {
    console.error('Broadcast send error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.delete('/whatsapp/broadcast/:id', async (req, res) => {
  try {
    const { id } = req.params
    await broadcastService.deleteBroadcastList(id)
    res.json({ success: true, message: 'Broadcast list deleted' })
  } catch (error: any) {
    console.error('Delete broadcast error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
