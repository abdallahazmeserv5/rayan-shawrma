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
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Wait for mongoose connection to be ready
        if (mongoose_1.default.connection.readyState !== 1) {
            yield new Promise((resolve) => {
                mongoose_1.default.connection.once('connected', resolve);
            });
        }
        const collection = (_a = mongoose_1.default.connection.db) === null || _a === void 0 ? void 0 : _a.collection('flows');
        if (!collection)
            return;
        const indexes = yield collection.indexes().catch(() => []);
        const uniqueSessionIdIndex = indexes.find((idx) => { var _a; return ((_a = idx.key) === null || _a === void 0 ? void 0 : _a.sessionId) && idx.unique === true; });
        if (uniqueSessionIdIndex && uniqueSessionIdIndex.name) {
            console.log(`[Flow Model] ⚠️  Dropping problematic unique index: ${uniqueSessionIdIndex.name}`);
            yield collection.dropIndex(uniqueSessionIdIndex.name);
            console.log(`[Flow Model] ✅ Index dropped successfully`);
        }
    }
    catch (_ignore) {
        // Silently ignore - collection may not exist yet
    }
}))();
