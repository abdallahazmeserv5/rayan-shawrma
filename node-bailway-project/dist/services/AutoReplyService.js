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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoReplyService = void 0;
const AutoReplyConfig_1 = require("../models/AutoReplyConfig");
const axios_1 = __importDefault(require("axios"));
class AutoReplyService {
    constructor(manager) {
        this.config = null;
        this.replyDelay = 2000; // 2 seconds
        this.manager = manager;
        this.loadConfig();
    }
    loadConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.config = yield AutoReplyConfig_1.AutoReplyConfig.findOne();
                console.log('📋 Auto-reply config loaded:', this.config);
            }
            catch (e) {
                console.error('❌ Error loading auto-reply config:', e);
            }
        });
    }
    handleIncomingMessage(receivedOnSession, from, _text) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fire and forget
            this.sendAutoReplyAsync(receivedOnSession, from, _text).catch((err) => {
                console.error('❌ Auto-reply background error:', err);
            });
        });
    }
    sendAutoReplyAsync(receivedOnSession, from, _text) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(`\n🤖 ===== Auto-reply triggered =====`);
                console.log(`📥 Message from ${from} on session: ${receivedOnSession}`);
                yield this.loadConfig();
                if (!this.config)
                    return console.log('⚠️ No config found');
                if (!this.config.isActive) {
                    console.log('⏸️ Auto-reply is disabled');
                    return;
                }
                if (!this.config.messageContent) {
                    console.log('⚠️ No message content configured');
                    return;
                }
                // KEY CHANGE: Use senderNumber if configured, otherwise use receiving session
                let sessionToUse = receivedOnSession;
                if (this.config.senderNumber && this.config.senderNumber.trim()) {
                    // Use the configured sender session (DIFFERENT from receiving session)
                    sessionToUse = this.config.senderNumber;
                    console.log(`📤 Using configured sender session: ${sessionToUse} (received on: ${receivedOnSession})`);
                }
                else {
                    console.log(`📤 Using receiving session: ${sessionToUse}`);
                }
                // Wait for stabilization
                console.log(`⏳ Waiting ${this.replyDelay}ms...`);
                yield new Promise((res) => setTimeout(res, this.replyDelay));
                const to = from;
                const messageText = this.config.messageContent;
                console.log(`📤 Sending auto-reply via HTTP from ${sessionToUse} to ${to}`);
                yield axios_1.default.post('http://localhost:3001/message/send', {
                    sessionId: sessionToUse,
                    to: to,
                    text: messageText,
                });
                console.log('✅ Auto-reply sent successfully!');
            }
            catch (error) {
                console.error('❌ Failed to send auto-reply:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            }
        });
    }
    getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield AutoReplyConfig_1.AutoReplyConfig.findOne();
            if (!config) {
                config = new AutoReplyConfig_1.AutoReplyConfig({
                    isActive: false,
                    senderNumber: '',
                    messageContent: 'Thank you for contacting us!',
                });
                yield config.save();
            }
            return config;
        });
    }
    updateConfig(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let config = yield AutoReplyConfig_1.AutoReplyConfig.findOne();
            if (!config) {
                config = new AutoReplyConfig_1.AutoReplyConfig(data);
            }
            else {
                Object.assign(config, data);
            }
            yield config.save();
            this.config = config;
            console.log('✅ Auto-reply config updated');
            return config;
        });
    }
}
exports.AutoReplyService = AutoReplyService;
