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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppManager = void 0;
const WhatsAppClient_1 = require("./WhatsAppClient");
const SessionManager_1 = require("./SessionManager");
const FlowExecutor_1 = require("./services/FlowExecutor");
class WhatsAppManager {
    constructor() {
        this.clients = new Map();
        this.sessionManager = new SessionManager_1.SessionManager();
        this.flowExecutor = new FlowExecutor_1.FlowExecutor(this);
    }
    setAutoReplyService(service) {
        this.autoReplyService = service;
        console.log('✅ Auto-reply service connected to WhatsApp Manager');
    }
    startSession(sessionId, qrCallback, statusCallback) {
        return __awaiter(this, void 0, void 0, function* () {
            // If session exists, check if it's connected
            if (this.clients.has(sessionId)) {
                const existingClient = this.clients.get(sessionId);
                const socket = existingClient === null || existingClient === void 0 ? void 0 : existingClient.getSocket();
                // If already connected, don't create a new session
                if (socket && socket.user && socket.user.id) {
                    console.log(`Session ${sessionId} is already connected`);
                    if (statusCallback)
                        statusCallback('connected');
                    return;
                }
                // Session exists but not connected - delete it and create a new one
                console.log(`Session ${sessionId} exists but not connected, restarting...`);
                try {
                    yield (existingClient === null || existingClient === void 0 ? void 0 : existingClient.destroy());
                }
                catch (e) {
                    console.error('Error destroying old session:', e);
                }
                this.clients.delete(sessionId);
            }
            const client = new WhatsAppClient_1.WhatsAppClient(sessionId, this.sessionManager, qrCallback, statusCallback, (msg) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                this.flowExecutor.handleIncomingMessage(sessionId, msg.key.remoteJid || '', ((_a = msg.message) === null || _a === void 0 ? void 0 : _a.conversation) ||
                    ((_c = (_b = msg.message) === null || _b === void 0 ? void 0 : _b.extendedTextMessage) === null || _c === void 0 ? void 0 : _c.text) ||
                    ((_e = (_d = msg.message) === null || _d === void 0 ? void 0 : _d.imageMessage) === null || _e === void 0 ? void 0 : _e.caption) ||
                    '', msg.key.fromMe || false);
                // Call auto-reply service if configured
                if (this.autoReplyService) {
                    const from = msg.key.remoteJid || '';
                    const text = ((_f = msg.message) === null || _f === void 0 ? void 0 : _f.conversation) ||
                        ((_h = (_g = msg.message) === null || _g === void 0 ? void 0 : _g.extendedTextMessage) === null || _h === void 0 ? void 0 : _h.text) ||
                        ((_k = (_j = msg.message) === null || _j === void 0 ? void 0 : _j.imageMessage) === null || _k === void 0 ? void 0 : _k.caption) ||
                        '';
                    console.log(`\n🤖 ===== Auto-reply triggered =====`);
                    console.log(`📥 Message from ${from} on session: ${sessionId}`);
                    this.autoReplyService.handleIncomingMessage(sessionId, from, text).catch((err) => {
                        console.error('Auto-reply error:', err);
                    });
                }
            });
            yield client.initialize();
            this.clients.set(sessionId, client);
        });
    }
    getClient(sessionId) {
        return this.clients.get(sessionId);
    }
    sendMessage(sessionId, to, content) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.clients.get(sessionId);
            if (!client) {
                throw new Error(`Session ${sessionId} not found`);
            }
            yield client.sendMessage(to, content);
        });
    }
    deleteSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const client = this.clients.get(sessionId);
            if (!client) {
                throw new Error(`Session ${sessionId} not found`);
            }
            // Close the connection
            yield client.destroy();
            // Remove from clients map
            this.clients.delete(sessionId);
            // Delete session files
            yield this.sessionManager.deleteSession(sessionId);
            console.log(`Session ${sessionId} deleted successfully`);
        });
    }
    setFlowExecutor(executor) {
        this.flowExecutor = executor;
    }
    /**
     * Restore all previously connected sessions from MongoDB
     * Called on server startup to automatically reconnect sessions
     */
    restoreAllSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { Session } = yield Promise.resolve().then(() => __importStar(require('./models/Session')));
                // Find all sessions that were previously connected
                const sessions = yield Session.find({
                    status: { $in: ['connected', 'disconnected'] },
                });
                console.log(`[WhatsAppManager] Found ${sessions.length} sessions to restore`);
                for (const session of sessions) {
                    try {
                        console.log(`[WhatsAppManager] Restoring session: ${session.sessionId}`);
                        // Start the session without QR callback (will use stored credentials)
                        yield this.startSession(session.sessionId, undefined, // No QR callback - using stored creds
                        (status) => {
                            console.log(`[WhatsAppManager] Restored session ${session.sessionId} status: ${status}`);
                        });
                    }
                    catch (error) {
                        console.error(`[WhatsAppManager] Failed to restore session ${session.sessionId}:`, error.message);
                        // Continue with other sessions even if one fails
                    }
                }
                console.log(`[WhatsAppManager] Session restoration complete`);
            }
            catch (error) {
                console.error(`[WhatsAppManager] Error during session restoration:`, error);
            }
        });
    }
    bulkSendMessage(sessionId_1, recipients_1, text_1) {
        return __awaiter(this, arguments, void 0, function* (sessionId, recipients, text, delayMs = 2000) {
            const client = this.clients.get(sessionId);
            if (!client) {
                throw new Error(`Session ${sessionId} not found`);
            }
            const results = [];
            for (const recipient of recipients) {
                const trimmedRecipient = recipient.trim();
                if (!trimmedRecipient)
                    continue;
                try {
                    yield client.sendMessage(trimmedRecipient, text);
                    results.push({
                        recipient: trimmedRecipient,
                        status: 'success',
                    });
                }
                catch (error) {
                    results.push({
                        recipient: trimmedRecipient,
                        status: 'failed',
                        error: error.message,
                    });
                }
                // Add delay between messages
                yield new Promise((resolve) => setTimeout(resolve, delayMs));
            }
            return results;
        });
    }
    broadcastMessage(recipients_1, text_1) {
        return __awaiter(this, arguments, void 0, function* (recipients, text, delayMs = 2000) {
            const results = [];
            for (const recipient of recipients) {
                const trimmedRecipient = recipient.trim();
                if (!trimmedRecipient)
                    continue;
                for (const [sessionId, client] of this.clients.entries()) {
                    try {
                        yield client.sendMessage(trimmedRecipient, text);
                        results.push({
                            recipient: trimmedRecipient,
                            sessionId,
                            status: 'success',
                        });
                    }
                    catch (error) {
                        results.push({
                            recipient: trimmedRecipient,
                            sessionId,
                            status: 'failed',
                            error: error.message,
                        });
                    }
                    // Add delay between messages
                    yield new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
            return results;
        });
    }
}
exports.WhatsAppManager = WhatsAppManager;
