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
exports.createAutoReplyRoutes = createAutoReplyRoutes;
const express_1 = require("express");
function createAutoReplyRoutes(autoReplyService) {
    const router = (0, express_1.Router)();
    // Get current auto-reply configuration
    router.get('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const config = yield autoReplyService.getConfig();
            res.json(config);
        }
        catch (error) {
            console.error('Error getting auto-reply config:', error);
            res.status(500).json({ error: error.message });
        }
    }));
    // Update auto-reply configuration
    router.post('/', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('📝 Auto-reply POST request received:', req.body);
            const { isActive, senderNumber, messageContent } = req.body;
            if (isActive && (!senderNumber || !messageContent)) {
                console.log('⚠️ Validation failed: missing required fields');
                return res.status(400).json({
                    error: 'senderNumber and messageContent are required when active',
                });
            }
            console.log('🔄 Updating auto-reply config...');
            const config = yield autoReplyService.updateConfig({
                isActive,
                senderNumber,
                messageContent,
            });
            console.log('✅ Auto-reply config updated successfully:', config);
            res.json(config);
        }
        catch (error) {
            console.error('❌ Error updating auto-reply config:');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Full error:', error);
            res.status(500).json({ error: error.message || 'Internal server error' });
        }
    }));
    return router;
}
