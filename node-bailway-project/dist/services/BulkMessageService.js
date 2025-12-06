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
exports.BulkMessageService = void 0;
const helpers_1 = require("../utils/helpers");
class BulkMessageService {
    constructor(whatsAppManager) {
        this.whatsAppManager = whatsAppManager;
    }
    /**
     * Send bulk messages in parallel using Promise.all
     * No throttling - fires all messages instantly
     * Continues on error (ban-resistant)
     */
    sendBulkMessages(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sessionId, numbers, message } = request;
            // Validate session exists
            const client = this.whatsAppManager.clients.get(sessionId);
            if (!client) {
                throw new Error(`Session ${sessionId} not found or not connected`);
            }
            console.log("\n" + "=".repeat(80));
            console.log(`🚀 BULK SEND STARTING`);
            console.log(`Session: ${sessionId}`);
            console.log(`Total Messages: ${numbers.length}`);
            console.log(`Strategy: Promise.all() - ALL MESSAGES FIRE SIMULTANEOUSLY`);
            console.log(`No throttling, no delays, no limits!`);
            console.log("=".repeat(80));
            const startTime = Date.now();
            console.log(`⏰ Start Time: ${new Date(startTime).toISOString()}`);
            console.log(`🔥 FIRING ALL ${numbers.length} MESSAGES NOW...`);
            // Ensure message is a string
            const messageText = String(message || "").trim();
            if (!messageText) {
                throw new Error("Message cannot be empty");
            }
            let completedCount = 0;
            const total = numbers.length;
            // Send all messages in parallel with Promise.all
            // THIS FIRES ALL MESSAGES AT ONCE - NO THROTTLING
            const results = yield Promise.all(numbers.map((number) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const jid = (0, helpers_1.normalizePhoneNumber)(number);
                    // Retry logic with exponential backoff
                    // await retryWithBackoff(
                    //   async () => {
                    //     await client.sendMessage(jid, messageText);
                    //   },
                    //   1, // 3 retries
                    //   300 // 1 second initial delay
                    // );
                    yield client.sendMessage(jid, messageText);
                    completedCount++;
                    if (completedCount % 50 === 0 || completedCount === total) {
                        console.log(`[BulkService] 📤 Progress: ${completedCount}/${total} (${((completedCount / total) *
                            100).toFixed(1)}%)`);
                    }
                    return {
                        number,
                        status: "success",
                    };
                }
                catch (error) {
                    completedCount++;
                    if (completedCount % 50 === 0 || completedCount === total) {
                        console.log(`[BulkService] 📤 Progress: ${completedCount}/${total} (${((completedCount / total) *
                            100).toFixed(1)}%)`);
                    }
                    console.error(`Failed to send to ${number}: ${error.message}`);
                    return {
                        number,
                        status: "failed",
                        error: error.message,
                    };
                }
            })));
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000; // seconds
            // Calculate statistics
            const sent = results.filter((r) => r.status === "success").length;
            const failed = results.filter((r) => r.status === "failed").length;
            const errors = results.filter((r) => r.status === "failed");
            console.log("\n" + "=".repeat(80));
            console.log(`✅ BULK SEND COMPLETE`);
            console.log(`⏰ End Time: ${new Date(endTime).toISOString()}`);
            console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
            console.log(`📊 Sent: ${sent} ✅`);
            console.log(`📊 Failed: ${failed} ❌`);
            console.log(`📊 Total: ${numbers.length}`);
            console.log(`📊 Success Rate: ${((sent / numbers.length) * 100).toFixed(2)}%`);
            console.log(`⚡ Speed: ${(numbers.length / duration).toFixed(2)} messages/second`);
            console.log("=".repeat(80) + "\n");
            return {
                success: true,
                sent,
                failed,
                errors,
                results,
            };
        });
    }
    /**
     * Handle connection loss gracefully
     * This method can be called when connection is lost
     */
    handleConnectionLoss(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Connection lost for session ${sessionId}, attempting retry...`);
            try {
                // Wait before retry
                yield new Promise((resolve) => setTimeout(resolve, 5000));
                // Check if session is reconnected
                const client = this.whatsAppManager.clients.get(sessionId);
                if (client) {
                    console.log(`Session ${sessionId} reconnected successfully`);
                }
                else {
                    console.error(`Session ${sessionId} could not be reconnected`);
                }
            }
            catch (error) {
                console.error(`Failed to handle connection loss:`, error.message);
            }
        });
    }
}
exports.BulkMessageService = BulkMessageService;
