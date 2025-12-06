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
exports.createMessageWorker = createMessageWorker;
const bullmq_1 = require("bullmq");
const MessageLog_1 = require("../models/MessageLog");
const CampaignContact_1 = require("../models/CampaignContact");
const helpers_1 = require("../utils/helpers");
function createMessageWorker(senderManager, campaignManager, whatsappManager) {
    const worker = new bullmq_1.Worker('message-queue', (job) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { contactId, campaignId, message, variables, senderIds } = job.data;
        console.log(`\n📨 Processing message job for contact: ${contactId}`);
        // Select sender
        let sender;
        if (senderIds && senderIds.length > 0) {
            // Use specific senders (round-robin among them)
            for (const senderId of senderIds) {
                const s = yield senderManager.getSenderById(senderId);
                if (s && s.status === 'connected' && (yield senderManager.hasAvailableQuota(s))) {
                    sender = s;
                    break;
                }
            }
        }
        else {
            // Auto-select healthy sender
            sender = yield senderManager.getNextHealthySender();
        }
        if (!sender) {
            throw new Error('No healthy sender available');
        }
        console.log(`📱 Using sender: ${sender.name} (${sender.phoneNumber})`);
        // Check quota
        if (!(yield senderManager.hasAvailableQuota(sender))) {
            throw new Error(`Sender ${sender.name} quota exceeded`);
        }
        // Personalize message
        let personalizedMessage = message;
        if (variables) {
            for (const [key, value] of Object.entries(variables)) {
                personalizedMessage = personalizedMessage.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
        }
        // Get contact info
        // Ensure contactId is a string (MongoDB ObjectIds can be passed as strings)
        const contactIdStr = typeof contactId === 'string' ? contactId : String(contactId);
        const contact = yield CampaignContact_1.CampaignContact.findById(contactIdStr);
        if (!contact)
            throw new Error(`Contact not found: ${contactIdStr}`);
        const jid = (0, helpers_1.normalizePhoneNumber)(contact.phoneNumber);
        // Human-like delay before starting
        const preDelay = Math.random() * (3000 - 1000) + 1000; // 1-3 seconds
        console.log(`⏳ Pre-delay: ${Math.round(preDelay)}ms`);
        yield new Promise((resolve) => setTimeout(resolve, preDelay));
        // Get WhatsApp client
        const client = whatsappManager.getClient(sender.id);
        if (!client) {
            throw new Error(`WhatsApp client not found for sender ${sender.name}`);
        }
        // Get the socket for presence updates
        const socket = client.getSocket();
        if (!socket) {
            throw new Error(`WhatsApp socket not initialized for sender ${sender.name}`);
        }
        try {
            // Typing simulation
            console.log(`⌨️  Simulating typing...`);
            yield socket.presenceSubscribe(jid);
            yield socket.sendPresenceUpdate('composing', jid);
            // Random typing duration based on message length
            const baseTypingTime = personalizedMessage.length * 50; // 50ms per character
            const typingDuration = baseTypingTime + Math.random() * (2000 - 500) + 500; // Add 0.5-2s jitter
            const cappedTyping = Math.min(typingDuration, 5000); // Max 5 seconds
            console.log(`⌨️  Typing for: ${Math.round(cappedTyping)}ms`);
            yield new Promise((resolve) => setTimeout(resolve, cappedTyping));
            // Send message
            console.log(`📤 Sending message...`);
            const result = yield socket.sendMessage(jid, {
                text: personalizedMessage,
            });
            // Stop typing
            yield socket.sendPresenceUpdate('paused', jid);
            // Update contact status
            yield campaignManager.updateContactStatus(contactId, 'sent');
            // Log message
            const messageLog = new MessageLog_1.MessageLog({
                campaignId,
                contactId,
                phoneNumber: contact.phoneNumber,
                senderId: sender.id,
                message: personalizedMessage,
                status: 'sent',
                sentAt: new Date(),
            });
            yield messageLog.save();
            // Update sender metrics
            yield senderManager.incrementUsage(sender.id);
            yield senderManager.updateHealth(sender.id, true);
            console.log(`✅ Message sent successfully to ${contact.phoneNumber}`);
            return {
                success: true,
                messageId: ((_a = result === null || result === void 0 ? void 0 : result.key) === null || _a === void 0 ? void 0 : _a.id) || 'unknown',
                senderId: sender.id,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Failed to send message: ${errorMessage}`);
            // Stop typing if error
            try {
                yield socket.sendPresenceUpdate('paused', jid);
            }
            catch (_b) { }
            // Update contact as failed
            yield campaignManager.updateContactStatus(contactId, 'failed', errorMessage);
            // Update sender health
            yield senderManager.updateHealth(sender.id, false);
            throw error;
        }
    }), {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        concurrency: 5, // Process 5 messages simultaneously
        limiter: {
            max: 20, // Max 20 jobs
            duration: 60000, // per minute (global rate limit)
        },
    });
    // Event handlers
    worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} completed`);
    });
    worker.on('failed', (job, error) => __awaiter(this, void 0, void 0, function* () {
        if (job) {
            console.error(`❌ Job ${job.id} failed: ${error.message}`);
            // Retry with exponential backoff
            if (job.attemptsMade < 3) {
                const delay = Math.pow(2, job.attemptsMade) * 2000; // 2s, 4s, 8s
                console.log(`🔄 Retrying job ${job.id} in ${delay}ms (attempt ${job.attemptsMade + 1}/3)`);
            }
            else {
                console.error(`⛔ Job ${job.id} exhausted all retries`);
            }
        }
    }));
    worker.on('error', (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Worker error: ${errorMessage}`);
    });
    console.log('✅ Message worker started');
    return worker;
}
