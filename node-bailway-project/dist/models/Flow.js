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
exports.Flow = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FlowSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String, default: null },
    triggerType: {
        type: String,
        enum: ['keyword', 'message', 'event'],
        required: true,
    },
    keywords: { type: [String], default: null },
    sessionId: { type: String, default: null }, // Session assigned to this flow
    nodes: { type: mongoose_1.Schema.Types.Mixed, required: true },
    edges: { type: mongoose_1.Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: false },
}, {
    timestamps: true,
});
// Create a sparse index on sessionId for faster queries
// sparse: only index documents that have sessionId field
// Removed unique constraint to allow multiple flows with the same sessionId or null
FlowSchema.index({ sessionId: 1 }, { sparse: true });
exports.Flow = mongoose_1.default.model('Flow', FlowSchema);
