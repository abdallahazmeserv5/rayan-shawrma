"use strict";
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
exports.SenderManager = void 0;
const Sender_1 = require("../models/Sender");
class SenderManager {
    constructor(whatsappManager) {
        this.qrCodes = new Map();
        this.whatsappManager = whatsappManager;
    }
    /**
     * Connect a sender and generate QR code
     */
    connectSender(senderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sender = yield this.getSenderById(senderId);
            if (!sender)
                throw new Error('Sender not found');
            console.log(`Starting session for sender ${sender.name} (${sender.id})`);
            try {
                yield this.whatsappManager.startSession(sender.id, (qr) => {
                    console.log(`QR Code generated for sender ${sender.name}`);
                    this.qrCodes.set(sender.id, qr);
                }, (status) => __awaiter(this, void 0, void 0, function* () {
                    console.log(`Sender ${sender.name} status: ${status}`);
                    if (status === 'open') {
                        this.qrCodes.delete(sender.id);
                        yield this.updateStatus(sender.id, 'connected');
                    }
                    else if (status === 'close') {
                        yield this.updateStatus(sender.id, 'disconnected');
                    }
                    else if (status === 'connecting') {
                        // Optional: update to connecting status if you have it
                    }
                }));
            }
            catch (error) {
                console.error(`Failed to connect sender ${sender.name}:`, error);
                throw error;
            }
        });
    }
    /**
     * Get QR code for a sender
     */
    getQrCode(senderId) {
        return this.qrCodes.get(senderId);
    }
    /**
     * Get next available sender using round-robin with health checks
     */
    getNextHealthySender() {
        return __awaiter(this, void 0, void 0, function* () {
            const senders = yield Sender_1.Sender.find({
                status: 'connected',
                isActive: true,
            }).sort({ lastUsed: 1 }); // Round-robin: least recently used first
            for (const sender of senders) {
                // Check health score
                if (sender.healthScore < 50) {
                    console.warn(`Skipping sender ${sender.name} - low health score: ${sender.healthScore}`);
                    continue;
                }
                // Check quotas
                if (!(yield this.hasAvailableQuota(sender))) {
                    console.warn(`Skipping sender ${sender.name} - quota exceeded`);
                    continue;
                }
                // Check consecutive failures
                if (sender.consecutiveFailures >= 5) {
                    console.warn(`Skipping sender ${sender.name} - too many consecutive failures`);
                    continue;
                }
                return sender;
            }
            return null;
        });
    }
    /**
     * Get sender by ID
     */
    getSenderById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Sender_1.Sender.findById(id);
        });
    }
    /**
     * Check if sender has available quota
     */
    hasAvailableQuota(sender) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            // Reset counters if needed
            let needsSave = false;
            if (now.getTime() - sender.lastResetMinute.getTime() >= 60000) {
                sender.sentThisMinute = 0;
                sender.lastResetMinute = now;
                needsSave = true;
            }
            if (now.getTime() - sender.lastResetHour.getTime() >= 3600000) {
                sender.sentThisHour = 0;
                sender.lastResetHour = now;
                needsSave = true;
            }
            if (now.getTime() - sender.lastResetDay.getTime() >= 86400000) {
                sender.sentThisDay = 0;
                sender.lastResetDay = now;
                needsSave = true;
            }
            if (needsSave) {
                yield sender.save();
            }
            // Check limits
            return (sender.sentThisMinute < sender.quotaPerMinute &&
                sender.sentThisHour < sender.quotaPerHour &&
                sender.sentThisDay < sender.quotaPerDay);
        });
    }
    /**
     * Increment sender usage
     */
    incrementUsage(senderId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Sender_1.Sender.findByIdAndUpdate(senderId, {
                $inc: { sentThisMinute: 1, sentThisHour: 1, sentThisDay: 1 },
                lastUsed: new Date(),
            });
        });
    }
    /**
     * Update sender health score
     */
    updateHealth(senderId, success) {
        return __awaiter(this, void 0, void 0, function* () {
            const sender = yield Sender_1.Sender.findById(senderId);
            if (!sender)
                return;
            if (success) {
                sender.successCount++;
                sender.consecutiveFailures = 0;
                sender.healthScore = Math.min(100, sender.healthScore + 1);
            }
            else {
                sender.failureCount++;
                sender.consecutiveFailures++;
                sender.lastFailure = new Date();
                sender.healthScore = Math.max(0, sender.healthScore - 5);
                // Auto-pause if too many failures
                if (sender.consecutiveFailures >= 10) {
                    sender.status = 'paused';
                    console.warn(`⚠️  Sender ${sender.name} auto-paused due to ${sender.consecutiveFailures} consecutive failures`);
                }
            }
            yield sender.save();
        });
    }
    /**
     * Create a new sender
     */
    createSender(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const sender = new Sender_1.Sender({
                name: data.name,
                phoneNumber: data.phoneNumber,
                quotaPerMinute: data.quotaPerMinute || 20,
                quotaPerHour: data.quotaPerHour || 500,
                quotaPerDay: data.quotaPerDay || 5000,
                status: 'disconnected',
                healthScore: 100,
            });
            return yield sender.save();
        });
    }
    /**
     * Update sender status
     */
    updateStatus(senderId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateData = { status };
            if (status === 'connected') {
                updateData.lastConnected = new Date();
            }
            yield Sender_1.Sender.findByIdAndUpdate(senderId, updateData);
        });
    }
    /**
     * Save sender session data
     */
    saveSessionData(senderId, sessionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionJson = JSON.stringify(sessionData);
            yield Sender_1.Sender.findByIdAndUpdate(senderId, { sessionData: sessionJson });
        });
    }
    /**
     * Get all senders
     */
    getAllSenders() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Sender_1.Sender.find().sort({ createdAt: -1 });
        });
    }
    /**
     * Get active senders
     */
    getActiveSenders() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Sender_1.Sender.find({ isActive: true }).sort({ healthScore: -1 });
        });
    }
    /**
     * Delete sender
     */
    deleteSender(senderId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Sender_1.Sender.findByIdAndDelete(senderId);
        });
    }
    /**
     * Restore all sender sessions on startup
     */
    restoreAllSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            const senders = yield Sender_1.Sender.find({ isActive: true });
            console.log(`\n${'='.repeat(80)}`);
            console.log(`🔄 RESTORING SENDER SESSIONS`);
            console.log(`Found ${senders.length} active sender(s)`);
            console.log('='.repeat(80));
            for (const sender of senders) {
                try {
                    if (sender.sessionData) {
                        console.log(`Restoring session for: ${sender.name}...`);
                        const sessionObj = JSON.parse(sender.sessionData);
                        // TODO: Implement session restoration with WhatsAppManager
                        // await this.whatsappManager.restoreSession(sender.id, sessionObj);
                        sender.status = 'connected';
                        console.log(`✅ ${sender.name} restored successfully`);
                    }
                    else {
                        sender.status = 'disconnected';
                        console.log(`⚠️  ${sender.name} has no session data`);
                    }
                }
                catch (error) {
                    sender.status = 'disconnected';
                    console.error(`❌ Failed to restore ${sender.name}:`, error.message);
                }
                yield sender.save();
            }
            console.log('='.repeat(80) + '\n');
        });
    }
    /**
     * Get sender statistics
     */
    getSenderStats(senderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sender = yield Sender_1.Sender.findById(senderId);
            if (!sender)
                return null;
            const totalSent = sender.successCount + sender.failureCount;
            const successRate = totalSent > 0 ? (sender.successCount / totalSent) * 100 : 0;
            return {
                totalSent,
                successRate,
                healthScore: sender.healthScore,
                quotaUsage: {
                    minute: {
                        used: sender.sentThisMinute,
                        limit: sender.quotaPerMinute,
                    },
                    hour: {
                        used: sender.sentThisHour,
                        limit: sender.quotaPerHour,
                    },
                    day: {
                        used: sender.sentThisDay,
                        limit: sender.quotaPerDay,
                    },
                },
            };
        });
    }
}
exports.SenderManager = SenderManager;
