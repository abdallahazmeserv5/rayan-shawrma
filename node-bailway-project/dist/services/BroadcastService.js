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
exports.BroadcastService = void 0;
const BroadcastList_1 = require("../models/BroadcastList");
const BroadcastGroup_1 = require("../models/BroadcastGroup");
const helpers_1 = require("../utils/helpers");
class BroadcastService {
    constructor(whatsAppManager) {
        this.whatsAppManager = whatsAppManager;
    }
    /**
     * Create broadcast list with automatic chunking into 256-contact groups
     */
    createBroadcastList(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sessionId, name, numbers } = request;
            // Validate session
            const client = this.whatsAppManager.clients.get(sessionId);
            if (!client) {
                throw new Error(`Session ${sessionId} not found or not connected`);
            }
            console.log(`Creating broadcast list "${name}" with ${numbers.length} contacts`);
            // Split numbers into chunks of 256
            const chunks = (0, helpers_1.chunkArray)(numbers, 256);
            console.log(`Will create ${chunks.length} broadcast groups`);
            // Create broadcast list entity
            const broadcastList = new BroadcastList_1.BroadcastList({
                name,
                sessionId,
                totalMembers: numbers.length,
            });
            yield broadcastList.save();
            // Create broadcast groups for each chunk
            const groupInfos = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                try {
                    // Note: Baileys doesn't have a direct broadcast API like groupCreate
                    // We'll store the groups and send messages individually to each member
                    // This simulates broadcast behavior
                    const broadcastGroup = new BroadcastGroup_1.BroadcastGroup({
                        broadcastListId: broadcastList.id,
                        broadcastJid: `broadcast_${broadcastList.id}_${i}`,
                        members: chunk,
                        memberCount: chunk.length,
                    });
                    yield broadcastGroup.save();
                    groupInfos.push({
                        id: broadcastGroup.id,
                        broadcastJid: broadcastGroup.broadcastJid || `broadcast_${broadcastList.id}_${i}`,
                        members: chunk,
                        memberCount: chunk.length,
                    });
                    console.log(`Created broadcast group ${i + 1}/${chunks.length} with ${chunk.length} members`);
                }
                catch (error) {
                    console.error(`Failed to create group ${i + 1}:`, error.message);
                }
            }
            return {
                id: broadcastList.id,
                name: broadcastList.name,
                groupCount: groupInfos.length,
                totalMembers: numbers.length,
                groups: groupInfos,
            };
        });
    }
    /**
     * Send message to all groups in a broadcast list
     * Sends to each group (256 numbers) simultaneously, with 10-second delay between groups
     */
    sendToBroadcastList(broadcastListId, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { message } = request;
            // Get broadcast list
            const broadcastList = yield BroadcastList_1.BroadcastList.findById(broadcastListId);
            if (!broadcastList) {
                throw new Error(`Broadcast list ${broadcastListId} not found`);
            }
            // Get all groups for this broadcast list
            const groups = yield BroadcastGroup_1.BroadcastGroup.find({ broadcastListId: broadcastList.id });
            const client = this.whatsAppManager.clients.get(broadcastList.sessionId);
            if (!client) {
                throw new Error(`Session ${broadcastList.sessionId} not found or not connected`);
            }
            console.log('\n' + '='.repeat(80));
            console.log(`📢 BROADCAST SENDING STARTED`);
            console.log(`Broadcast: ${broadcastList.name}`);
            console.log(`Total Groups: ${groups.length}`);
            console.log(`Total Recipients: ${broadcastList.totalMembers}`);
            console.log(`Strategy: Group-by-group with 10-second delay`);
            console.log(`Within each group: ALL 256 numbers send simultaneously`);
            console.log('='.repeat(80));
            const errors = [];
            let groupsSent = 0;
            const startTime = Date.now();
            // Ensure message is a string
            const messageText = String(message || '').trim();
            if (!messageText) {
                throw new Error('Message cannot be empty');
            }
            // Send to each group with 10-second delay between groups
            for (let i = 0; i < groups.length; i++) {
                const group = groups[i];
                const groupStartTime = Date.now();
                try {
                    console.log(`\n🔥 Group ${i + 1}/${groups.length}:`);
                    console.log(`   Members: ${group.memberCount}`);
                    console.log(`   Firing ALL ${group.memberCount} messages NOW...`);
                    // Send to all members in this group SIMULTANEOUSLY
                    yield Promise.all(group.members.map((number) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const jid = (0, helpers_1.normalizePhoneNumber)(number);
                            yield client.sendMessage(jid, messageText);
                        }
                        catch (error) {
                            errors.push(`Failed to send to ${number}: ${error.message}`);
                        }
                    })));
                    const groupDuration = (Date.now() - groupStartTime) / 1000;
                    groupsSent++;
                    console.log(`   ✅ Group ${i + 1} complete in ${groupDuration.toFixed(2)}s`);
                    console.log(`   Progress: ${groupsSent}/${groups.length} groups sent`);
                    // Add 10-second delay BETWEEN groups (not after the last one)
                    if (i < groups.length - 1) {
                        console.log(`   ⏳ Waiting 10 seconds before next group...`);
                        yield new Promise((resolve) => setTimeout(resolve, 10000));
                    }
                }
                catch (error) {
                    errors.push(`Failed to send to group ${group.id}: ${error.message}`);
                    console.error(`   ❌ Group ${i + 1} failed: ${error.message}`);
                }
            }
            const totalDuration = (Date.now() - startTime) / 1000;
            console.log('\n' + '='.repeat(80));
            console.log(`✅ BROADCAST COMPLETE`);
            console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)} seconds`);
            console.log(`📊 Groups Sent: ${groupsSent}/${groups.length}`);
            console.log(`📊 Total Recipients: ${broadcastList.totalMembers}`);
            console.log(`📊 Errors: ${errors.length}`);
            console.log('='.repeat(80) + '\n');
            return {
                success: true,
                groupsSent,
                totalRecipients: broadcastList.totalMembers,
                errors,
            };
        });
    }
    /**
     * Get all broadcast lists
     */
    getAllBroadcastLists() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield BroadcastList_1.BroadcastList.find().sort({ createdAt: -1 });
        });
    }
    /**
     * Get broadcast list by ID
     */
    getBroadcastListById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield BroadcastList_1.BroadcastList.findById(id);
        });
    }
    /**
     * Delete broadcast list
     */
    deleteBroadcastList(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const broadcastList = yield BroadcastList_1.BroadcastList.findById(id);
            if (!broadcastList) {
                throw new Error(`Broadcast list ${id} not found`);
            }
            // Delete associated groups
            yield BroadcastGroup_1.BroadcastGroup.deleteMany({ broadcastListId: id });
            // Delete the broadcast list
            yield broadcastList.deleteOne();
            console.log(`Deleted broadcast list ${id}`);
        });
    }
}
exports.BroadcastService = BroadcastService;
