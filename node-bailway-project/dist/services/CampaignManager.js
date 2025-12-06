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
exports.CampaignManager = void 0;
const Campaign_1 = require("../models/Campaign");
const CampaignContact_1 = require("../models/CampaignContact");
const Blocklist_1 = require("../models/Blocklist");
const bullmq_1 = require("bullmq");
class CampaignManager {
    constructor() {
        this.messageQueue = null;
        // BullMQ queue is optional - only initialize if Redis is available
        // Will be initialized on first use in startCampaign()
    }
    /**
     * Create campaign and upload contacts
     */
    createCampaign(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Filter out blocked numbers
            const blockedNumbers = yield Blocklist_1.Blocklist.find();
            const blockedSet = new Set(blockedNumbers.map((b) => b.phoneNumber));
            const validContacts = data.contacts.filter((c) => !blockedSet.has(c.phoneNumber));
            if (validContacts.length === 0) {
                throw new Error('No valid contacts after filtering blocklist');
            }
            // Create campaign
            const campaign = new Campaign_1.Campaign({
                name: data.name,
                template: data.template,
                status: 'draft',
                totalRecipients: validContacts.length,
                scheduledStart: data.scheduledStart,
                scheduledEnd: data.scheduledEnd,
                timeWindowStart: data.timeWindowStart,
                timeWindowEnd: data.timeWindowEnd,
                minDelay: data.minDelay || 2000,
                maxDelay: data.maxDelay || 5000,
                enableTyping: data.enableTyping !== false,
                senderIds: data.senderIds || null,
            });
            yield campaign.save();
            // Create contacts
            const contacts = validContacts.map((c) => new CampaignContact_1.CampaignContact({
                campaignId: campaign.id,
                phoneNumber: c.phoneNumber,
                variables: c.variables || {},
                status: 'pending',
            }));
            yield CampaignContact_1.CampaignContact.insertMany(contacts);
            console.log(`✅ Campaign "${campaign.name}" created with ${validContacts.length} contacts`);
            if (data.contacts.length > validContacts.length) {
                console.log(`⚠️  Filtered out ${data.contacts.length - validContacts.length} blocked number(s)`);
            }
            return campaign;
        });
    }
    /**
     * Start campaign - queue all messages
     */
    startCampaign(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize queue if not already done
            if (!this.messageQueue) {
                try {
                    this.messageQueue = new bullmq_1.Queue('message-queue', {
                        connection: {
                            host: process.env.REDIS_HOST || 'localhost',
                            port: parseInt(process.env.REDIS_PORT || '6379'),
                        },
                    });
                }
                catch (error) {
                    throw new Error('Redis is required for campaigns. Please install and start Redis, or use the Auto Reply feature instead.');
                }
            }
            const campaign = yield Campaign_1.Campaign.findById(campaignId);
            if (!campaign)
                throw new Error('Campaign not found');
            if (campaign.status !== 'draft' && campaign.status !== 'paused') {
                throw new Error(`Cannot start campaign with status: ${campaign.status}`);
            }
            // Get all pending contacts
            const contacts = yield CampaignContact_1.CampaignContact.find({ campaignId, status: 'pending' });
            if (contacts.length === 0) {
                throw new Error('No pending contacts to send');
            }
            console.log(`\n${'='.repeat(80)}`);
            console.log(`🚀 STARTING CAMPAIGN: ${campaign.name}`);
            console.log(`Total Contacts: ${contacts.length}`);
            console.log(`Min Delay: ${campaign.minDelay}ms`);
            console.log(`Max Delay: ${campaign.maxDelay}ms`);
            console.log('='.repeat(80));
            // Queue messages with staggered delays
            let cumulativeDelay = 0;
            for (const contact of contacts) {
                yield this.messageQueue.add('send-message', {
                    contactId: contact.id,
                    campaignId: campaign.id,
                    message: campaign.template,
                    variables: contact.variables,
                    senderIds: campaign.senderIds,
                }, {
                    delay: cumulativeDelay,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                });
                contact.status = 'queued';
                contact.queuedAt = new Date();
                // Random delay between messages
                const randomDelay = Math.random() * (campaign.maxDelay - campaign.minDelay) + campaign.minDelay;
                cumulativeDelay += randomDelay;
            }
            yield CampaignContact_1.CampaignContact.bulkSave(contacts);
            // Update campaign
            campaign.status = 'running';
            campaign.startedAt = new Date();
            yield campaign.save();
            console.log(`✅ Queued ${contacts.length} messages`);
            console.log(`⏱️  Estimated completion: ${Math.round(cumulativeDelay / 60000)} minutes`);
            console.log('='.repeat(80) + '\n');
        });
    }
    /**
     * Pause campaign
     */
    pauseCampaign(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            const campaign = yield Campaign_1.Campaign.findById(campaignId);
            if (!campaign)
                throw new Error('Campaign not found');
            campaign.status = 'paused';
            yield campaign.save();
            console.log(`⏸️  Campaign "${campaign.name}" paused`);
        });
    }
    /**
     * Resume campaign
     */
    resumeCampaign(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            const campaign = yield Campaign_1.Campaign.findById(campaignId);
            if (!campaign)
                throw new Error('Campaign not found');
            if (campaign.status !== 'paused') {
                throw new Error('Can only resume paused campaigns');
            }
            campaign.status = 'running';
            yield campaign.save();
            console.log(`▶️  Campaign "${campaign.name}" resumed`);
        });
    }
    /**
     * Get campaign by ID
     */
    getCampaignById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Campaign_1.Campaign.findById(id);
        });
    }
    /**
     * Get all campaigns
     */
    getAllCampaigns() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Campaign_1.Campaign.find().sort({ createdAt: -1 });
        });
    }
    /**
     * Get campaign statistics
     */
    getCampaignStats(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            const campaign = yield Campaign_1.Campaign.findById(campaignId);
            if (!campaign)
                return null;
            const contacts = yield CampaignContact_1.CampaignContact.find({ campaignId });
            const stats = {
                total: contacts.length,
                pending: contacts.filter((c) => c.status === 'pending').length,
                queued: contacts.filter((c) => c.status === 'queued').length,
                sent: contacts.filter((c) => c.status === 'sent').length,
                delivered: contacts.filter((c) => c.status === 'delivered').length,
                read: contacts.filter((c) => c.status === 'read').length,
                failed: contacts.filter((c) => c.status === 'failed').length,
                successRate: 0,
            };
            const completed = stats.sent + stats.delivered + stats.read + stats.failed;
            if (completed > 0) {
                stats.successRate = ((stats.sent + stats.delivered + stats.read) / completed) * 100;
            }
            return stats;
        });
    }
    /**
     * Delete campaign
     */
    deleteCampaign(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Delete associated contacts
            yield CampaignContact_1.CampaignContact.deleteMany({ campaignId });
            // Delete campaign
            yield Campaign_1.Campaign.findByIdAndDelete(campaignId);
            console.log(`🗑️  Campaign deleted: ${campaignId}`);
        });
    }
    /**
     * Update contact status
     */
    updateContactStatus(contactId, status, errorMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            const contact = yield CampaignContact_1.CampaignContact.findById(contactId);
            if (!contact)
                return;
            contact.status = status;
            switch (status) {
                case 'sent':
                    contact.sentAt = new Date();
                    break;
                case 'delivered':
                    contact.deliveredAt = new Date();
                    break;
                case 'read':
                    contact.readAt = new Date();
                    break;
                case 'failed':
                    contact.failedAt = new Date();
                    contact.errorMessage = errorMessage || null;
                    contact.attemptCount++;
                    break;
            }
            yield contact.save();
            // Update campaign counters
            yield this.updateCampaignCounters(contact.campaignId);
        });
    }
    /**
     * Update campaign counters
     */
    updateCampaignCounters(campaignId) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield this.getCampaignStats(campaignId);
            if (!stats)
                return;
            yield Campaign_1.Campaign.findByIdAndUpdate(campaignId, {
                processedCount: stats.sent + stats.delivered + stats.read + stats.failed,
                successCount: stats.sent + stats.delivered + stats.read,
                failedCount: stats.failed,
            });
            // Check if campaign is complete
            if (stats.pending === 0 && stats.queued === 0) {
                yield Campaign_1.Campaign.findByIdAndUpdate(campaignId, {
                    status: 'completed',
                    completedAt: new Date(),
                });
                console.log(`✅ Campaign ${campaignId} completed`);
            }
        });
    }
}
exports.CampaignManager = CampaignManager;
