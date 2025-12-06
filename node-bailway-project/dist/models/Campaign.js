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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Campaign = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CampaignSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    status: {
        type: String,
        enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'failed'],
        default: 'draft',
    },
    template: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    mediaType: {
        type: String,
        enum: ['image', 'video', 'document', null],
        default: null,
    },
    totalRecipients: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    scheduledStart: { type: Date, default: null },
    scheduledEnd: { type: Date, default: null },
    timeWindowStart: { type: String, default: null },
    timeWindowEnd: { type: String, default: null },
    timezone: { type: String, default: 'UTC' },
    minDelay: { type: Number, default: 2000 },
    maxDelay: { type: Number, default: 5000 },
    enableTyping: { type: Boolean, default: true },
    enableReadReceipts: { type: Boolean, default: false },
    senderIds: { type: [String], default: null },
    createdBy: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
}, {
    timestamps: true,
});
// Indexes for performance
CampaignSchema.index({ status: 1, createdAt: -1 });
exports.Campaign = mongoose_1.default.model('Campaign', CampaignSchema);
