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
exports.Sender = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SenderSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['connected', 'disconnected', 'banned', 'paused'],
        default: 'disconnected',
    },
    sessionData: { type: String, default: null },
    qrCode: { type: String, default: null },
    lastConnected: { type: Date, default: null },
    quotaPerMinute: { type: Number, default: 20 },
    quotaPerHour: { type: Number, default: 500 },
    quotaPerDay: { type: Number, default: 5000 },
    sentThisMinute: { type: Number, default: 0 },
    sentThisHour: { type: Number, default: 0 },
    sentThisDay: { type: Number, default: 0 },
    lastResetMinute: { type: Date, default: Date.now },
    lastResetHour: { type: Date, default: Date.now },
    lastResetDay: { type: Date, default: Date.now },
    healthScore: { type: Number, default: 100 },
    failureCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    lastFailure: { type: Date, default: null },
    consecutiveFailures: { type: Number, default: 0 },
    lastUsed: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});
// Indexes for performance
SenderSchema.index({ status: 1, isActive: 1, healthScore: 1 });
exports.Sender = mongoose_1.default.model('Sender', SenderSchema);
