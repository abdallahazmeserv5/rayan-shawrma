"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const WhatsAppManager_1 = require("./WhatsAppManager");
const database_1 = require("./config/database");
const models_1 = require("./models");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const BulkMessageService_1 = require("./services/BulkMessageService");
const BroadcastService_1 = require("./services/BroadcastService");
const SenderManager_1 = require("./services/SenderManager");
const CampaignManager_1 = require("./services/CampaignManager");
const AutoReplyService_1 = require("./services/AutoReplyService");
const senderRoutes_1 = require("./routes/senderRoutes");
const campaignRoutes_1 = require("./routes/campaignRoutes");
const autoReplyRoutes_1 = require("./routes/autoReplyRoutes");
const messageWorker_1 = require("./workers/messageWorker");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CORS configuration to allow Next.js app to communicate
app.use((0, cors_1.default)({
    origin: ((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:3000'],
    credentials: true,
}));
app.use(express_1.default.json({ limit: '500mb' }));
app.use(express_1.default.urlencoded({ limit: '500mb', extended: true }));
// In-memory storage
const qrCodes = new Map();
const sessionStatuses = new Map();
// Initialize the WhatsApp Manager
const manager = new WhatsAppManager_1.WhatsAppManager();
// Initialize services
const bulkMessageService = new BulkMessageService_1.BulkMessageService(manager);
const broadcastService = new BroadcastService_1.BroadcastService(manager);
const senderManager = new SenderManager_1.SenderManager(manager);
const campaignManager = new CampaignManager_1.CampaignManager();
const autoReplyService = new AutoReplyService_1.AutoReplyService(manager);
// Initialize Routes
app.use('/api/senders', (0, senderRoutes_1.createSenderRoutes)(senderManager));
app.use('/api/campaigns', (0, campaignRoutes_1.createCampaignRoutes)(campaignManager));
app.use('/api/auto-reply', (0, autoReplyRoutes_1.createAutoReplyRoutes)(autoReplyService));
// Initialize Database
(0, database_1.connectToDatabase)()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log('✅ MongoDB initialized successfully');
    // Connect auto-reply service to WhatsApp manager
    manager.setAutoReplyService(autoReplyService);
    // DISABLED: Auto-restore causes "conflict" errors when same account logs in multiple times
    // Restore WhatsApp sessions from MongoDB
    // console.log('🔄 Restoring WhatsApp sessions...')
    // await manager.restoreAllSessions()
    // Initialize Enterprise Features
    yield senderManager.restoreAllSessions();
    // Initialize message worker (requires Redis)
    try {
        (0, messageWorker_1.createMessageWorker)(senderManager, campaignManager, manager);
        console.log('✅ Message worker initialized');
    }
    catch (error) {
        console.warn('⚠️  Message worker not initialized (Redis may not be available):', error.message);
        console.warn("   Campaigns will queue jobs but they won't be processed without Redis");
    }
    console.log('✅ Enterprise WhatsApp System Initialized');
}))
    .catch((error) => {
    console.error('Error initializing database:', error);
});
app.post('/session/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId } = req.body;
    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
    }
    try {
        // Set initial status
        sessionStatuses.set(sessionId, 'connecting');
        yield manager.startSession(sessionId, (qr) => {
            console.log(`QR Code for session ${sessionId}:`);
            qrcode_terminal_1.default.generate(qr, { small: true });
            qrCodes.set(sessionId, qr);
        }, (status) => {
            console.log(`Session ${sessionId} status: ${status}`);
            sessionStatuses.set(sessionId, status);
        });
        res.json({
            message: `Session ${sessionId} started. Check console for QR.`,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.get('/session/:sessionId/qr', (req, res) => {
    const { sessionId } = req.params;
    const qr = qrCodes.get(sessionId);
    if (!qr) {
        return res.status(404).json({ error: 'QR code not found or session connected' });
    }
    res.json({ qr });
});
app.get('/session/:sessionId/status', (req, res) => {
    const { sessionId } = req.params;
    // First check if we have a client for this session
    const client = manager.getClient(sessionId);
    if (client) {
        const socket = client.getSocket();
        if (socket) {
            // Check if socket is actually connected
            const isConnected = socket.user && socket.user.id;
            if (isConnected) {
                sessionStatuses.set(sessionId, 'connected');
                return res.json({ status: 'connected' });
            }
        }
    }
    // Fall back to stored status
    const status = sessionStatuses.get(sessionId) || 'disconnected';
    res.json({ status });
});
app.get('/sessions', (req, res) => {
    const sessions = Array.from(sessionStatuses.entries()).map(([id, status]) => ({
        sessionId: id,
        status,
    }));
    res.json({ sessions });
});
// ============================================
// SESSION MANAGEMENT API (MongoDB-backed)
// ============================================
// List all sessions from database
app.get('/api/sessions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { Session } = yield Promise.resolve().then(() => __importStar(require('./models/Session')));
        const sessions = yield Session.find().sort({ createdAt: -1 });
        // Enrich with live connection status
        const enrichedSessions = sessions.map((session) => {
            var _a;
            const client = manager.getClient(session.sessionId);
            let liveStatus = session.status;
            if (client) {
                const socket = client.getSocket();
                if ((_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.id) {
                    liveStatus = 'connected';
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
            };
        });
        res.json({ sessions: enrichedSessions });
    }
    catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Get single session
app.get('/api/sessions/:sessionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { sessionId } = req.params;
        const { Session } = yield Promise.resolve().then(() => __importStar(require('./models/Session')));
        const session = yield Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        // Check live status
        const client = manager.getClient(sessionId);
        let liveStatus = session.status;
        if (client) {
            const socket = client.getSocket();
            if ((_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.id) {
                liveStatus = 'connected';
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
        });
    }
    catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Delete session (from DB and disconnect)
app.delete('/api/sessions/:sessionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        // Disconnect if connected
        const client = manager.getClient(sessionId);
        if (client) {
            yield manager.deleteSession(sessionId);
        }
        else {
            // Just delete from database
            const { Session } = yield Promise.resolve().then(() => __importStar(require('./models/Session')));
            yield Session.deleteOne({ sessionId });
        }
        // Clean up in-memory storage
        qrCodes.delete(sessionId);
        sessionStatuses.delete(sessionId);
        res.json({ success: true, message: `Session ${sessionId} deleted` });
    }
    catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Reconnect a disconnected session
app.post('/api/sessions/:sessionId/reconnect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { sessionId } = req.params;
        const { Session } = yield Promise.resolve().then(() => __importStar(require('./models/Session')));
        // Check if session exists in database
        const session = yield Session.findOne({ sessionId });
        if (!session) {
            return res.status(404).json({ error: 'Session not found in database' });
        }
        // Check if already connected
        const existingClient = manager.getClient(sessionId);
        if (existingClient) {
            const socket = existingClient.getSocket();
            if ((_a = socket === null || socket === void 0 ? void 0 : socket.user) === null || _a === void 0 ? void 0 : _a.id) {
                return res.json({ success: true, message: 'Session already connected', needsQr: false });
            }
        }
        // Start the session (will use existing creds from DB)
        sessionStatuses.set(sessionId, 'connecting');
        yield manager.startSession(sessionId, (qr) => {
            console.log(`QR Code for session ${sessionId}:`);
            qrcode_terminal_1.default.generate(qr, { small: true });
            qrCodes.set(sessionId, qr);
        }, (status) => {
            console.log(`Session ${sessionId} status: ${status}`);
            sessionStatuses.set(sessionId, status);
        });
        res.json({
            success: true,
            message: `Reconnection initiated for session ${sessionId}`,
            needsQr: !session.creds || Object.keys(session.creds).length === 0,
        });
    }
    catch (error) {
        console.error('Error reconnecting session:', error);
        res.status(500).json({ error: error.message });
    }
}));
app.post('/message/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId, to, text } = req.body;
    if (!sessionId || !to || !text) {
        return res.status(400).json({ error: 'sessionId, to, and text are required' });
    }
    try {
        yield manager.sendMessage(sessionId, to, text);
        res.json({ message: 'Message sent successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.delete('/session/:sessionId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId } = req.params;
    try {
        yield manager.deleteSession(sessionId);
        res.json({ message: `Session ${sessionId} deleted successfully` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.post('/message/send-bulk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId, recipients, text, delayMs } = req.body;
    if (!sessionId || !recipients || !text) {
        return res.status(400).json({ error: 'sessionId, recipients, and text are required' });
    }
    if (!Array.isArray(recipients)) {
        return res.status(400).json({ error: 'recipients must be an array' });
    }
    try {
        const results = yield manager.bulkSendMessage(sessionId, recipients, text, delayMs);
        res.json({ results });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.post('/message/send-all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { recipients, text, delayMs } = req.body;
    if (!recipients || !text) {
        return res.status(400).json({ error: 'recipients and text are required' });
    }
    if (!Array.isArray(recipients)) {
        return res.status(400).json({ error: 'recipients must be an array' });
    }
    try {
        const results = yield manager.broadcastMessage(recipients, text, delayMs);
        res.json({ results });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Flow Management Endpoints
app.post('/api/flows', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, nodes, edges, triggerType, keywords, sessionId, isActive } = req.body;
        // Check if sessionId is already assigned to another flow
        if (sessionId) {
            const existingFlow = yield models_1.Flow.findOne({ sessionId });
            if (existingFlow) {
                return res.status(400).json({
                    error: `Session "${sessionId}" is already assigned to flow "${existingFlow.name}". Each session can only be assigned to one flow.`,
                });
            }
        }
        const flow = new models_1.Flow({
            name,
            nodes,
            edges,
            triggerType,
            keywords,
            sessionId: sessionId || null,
            isActive: isActive !== undefined ? isActive : true,
        });
        yield flow.save();
        res.json({ success: true, flow });
    }
    catch (error) {
        console.error('Error saving flow:', error);
        res.status(500).json({ error: error.message });
    }
}));
app.get('/api/flows', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const flows = yield models_1.Flow.find().sort({ createdAt: -1 });
        res.json(flows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Get available sessions (not assigned to other flows) for a specific flow
app.get('/api/flows/available-sessions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currentFlowId } = req.query;
        // Get all sessions from the manager
        const sessions = Array.from(sessionStatuses.entries()).map(([id, status]) => ({
            sessionId: id,
            status,
        }));
        // Get all flows with assigned sessions
        const flowsWithSessions = yield models_1.Flow.find({ sessionId: { $ne: null } }).select('sessionId name');
        // Build a map of session -> flow name
        const assignedSessions = new Map();
        flowsWithSessions.forEach((flow) => {
            if (flow.sessionId && flow._id.toString() !== currentFlowId) {
                assignedSessions.set(flow.sessionId, flow.name);
            }
        });
        // Mark which sessions are available
        const sessionsWithAvailability = sessions.map((s) => (Object.assign(Object.assign({}, s), { isAvailable: !assignedSessions.has(s.sessionId), assignedToFlow: assignedSessions.get(s.sessionId) || null })));
        res.json({ sessions: sessionsWithAvailability });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Get a single flow by ID
app.get('/api/flows/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const flow = yield models_1.Flow.findById(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        res.json(flow);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Update a flow
app.put('/api/flows/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, nodes, edges, triggerType, keywords, sessionId, isActive } = req.body;
        const flow = yield models_1.Flow.findById(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        // Check if sessionId is already assigned to another flow (not this one)
        if (sessionId) {
            const existingFlow = yield models_1.Flow.findOne({
                sessionId,
                _id: { $ne: id },
            });
            if (existingFlow) {
                return res.status(400).json({
                    error: `Session "${sessionId}" is already assigned to flow "${existingFlow.name}". Each session can only be assigned to one flow.`,
                });
            }
        }
        // Update fields
        flow.name = name;
        flow.nodes = nodes;
        flow.edges = edges;
        flow.triggerType = triggerType;
        flow.keywords = keywords;
        flow.sessionId = sessionId || null;
        if (isActive !== undefined)
            flow.isActive = isActive;
        yield flow.save();
        res.json({ success: true, flow });
    }
    catch (error) {
        console.error('Error updating flow:', error);
        res.status(500).json({ error: error.message });
    }
}));
// Update flow sessionId only (for session assignment from flows list)
app.patch('/api/flows/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { sessionId } = req.body;
        const flow = yield models_1.Flow.findById(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        flow.sessionId = sessionId || null;
        yield flow.save();
        res.json({ success: true, flow });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.patch('/api/flows/:id/toggle', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const flow = yield models_1.Flow.findById(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        flow.isActive = !flow.isActive;
        yield flow.save();
        res.json({ success: true, flow });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
app.get('/api/flows/:id/executions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const executions = yield models_1.FlowExecution.find({ flowId: id })
            .populate('contactId')
            .sort({ startedAt: -1 })
            .limit(50);
        res.json(executions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// Delete a flow
app.delete('/api/flows/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const flow = yield models_1.Flow.findById(id);
        if (!flow) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        yield models_1.Flow.findByIdAndDelete(id);
        res.json({ success: true, message: 'Flow deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting flow:', error);
        res.status(500).json({ error: error.message });
    }
}));
// ============================================
// BULK MESSAGING ENDPOINTS
// ============================================
app.post('/whatsapp/bulk-send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId, numbers, message } = req.body;
        // sessionId is now optional - if not provided, will use all connected sessions
        if (!numbers || !message) {
            return res.status(400).json({
                error: 'numbers and message are required. sessionId is optional (will use all sessions if not provided)',
            });
        }
        if (!Array.isArray(numbers)) {
            return res.status(400).json({ error: 'numbers must be an array' });
        }
        const result = yield bulkMessageService.sendBulkMessages({
            sessionId,
            numbers,
            message,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Bulk send error:', error);
        res.status(500).json({ error: error.message });
    }
}));
// ============================================
// BROADCAST LIST ENDPOINTS
// ============================================
app.post('/whatsapp/broadcast/create', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId, name, numbers } = req.body;
        if (!sessionId || !name || !numbers) {
            return res.status(400).json({
                error: 'sessionId, name, and numbers are required',
            });
        }
        if (!Array.isArray(numbers)) {
            return res.status(400).json({ error: 'numbers must be an array' });
        }
        const result = yield broadcastService.createBroadcastList({
            sessionId,
            name,
            numbers,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Broadcast create error:', error);
        res.status(500).json({ error: error.message });
    }
}));
app.get('/whatsapp/broadcast', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const broadcasts = yield broadcastService.getAllBroadcastLists();
        res.json({ broadcasts });
    }
    catch (error) {
        console.error('Get broadcasts error:', error);
        res.status(500).json({ error: error.message });
    }
}));
app.get('/whatsapp/broadcast/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const broadcast = yield broadcastService.getBroadcastListById(id);
        if (!broadcast) {
            return res.status(404).json({ error: 'Broadcast list not found' });
        }
        res.json(broadcast);
    }
    catch (error) {
        console.error('Get broadcast error:', error);
        res.status(500).json({ error: error.message });
    }
}));
app.post('/whatsapp/broadcast/:id/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }
        const result = yield broadcastService.sendToBroadcastList(id, { message });
        res.json(result);
    }
    catch (error) {
        console.error('Broadcast send error:', error);
        res.status(500).json({ error: error.message });
    }
}));
app.delete('/whatsapp/broadcast/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield broadcastService.deleteBroadcastList(id);
        res.json({ success: true, message: 'Broadcast list deleted' });
    }
    catch (error) {
        console.error('Delete broadcast error:', error);
        res.status(500).json({ error: error.message });
    }
}));
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
