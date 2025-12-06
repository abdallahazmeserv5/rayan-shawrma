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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppClient = void 0;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const pino_1 = __importDefault(require("pino"));
class WhatsAppClient {
    constructor(sessionId, sessionManager, qrCallback, statusCallback, messageCallback) {
        this.socket = null;
        this.sessionId = sessionId;
        this.sessionManager = sessionManager;
        this.qrCallback = qrCallback;
        this.statusCallback = statusCallback;
        this.messageCallback = messageCallback;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const { state, saveCreds } = yield this.sessionManager.getAuthState(this.sessionId);
            this.socket = (0, baileys_1.default)({
                auth: state,
                printQRInTerminal: false,
                logger: (0, pino_1.default)({ level: 'silent' }),
            });
            this.socket.ev.on('creds.update', saveCreds);
            this.socket.ev.on('messages.upsert', (m) => __awaiter(this, void 0, void 0, function* () {
                if (m.type === 'notify' && this.messageCallback) {
                    for (const msg of m.messages) {
                        if (!msg.key.fromMe) {
                            this.messageCallback(msg);
                        }
                    }
                }
            }));
            this.socket.ev.on('connection.update', (update) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f, _g;
                const { connection, lastDisconnect, qr } = update;
                if (qr && this.qrCallback) {
                    this.qrCallback(qr);
                }
                if (connection === 'close') {
                    const shouldReconnect = ((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
                    console.log(`Connection closed due to ${lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error}, reconnecting: ${shouldReconnect}`);
                    if (this.statusCallback)
                        this.statusCallback('disconnected');
                    yield this.sessionManager.updateSessionStatus(this.sessionId, 'disconnected');
                    if (shouldReconnect) {
                        this.initialize();
                    }
                }
                else if (connection === 'open') {
                    console.log(`Session ${this.sessionId} opened successfully`);
                    if (this.statusCallback)
                        this.statusCallback('connected');
                    const phoneNumber = ((_e = (_d = (_c = this.socket) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id) === null || _e === void 0 ? void 0 : _e.split(':')[0]) || null;
                    const name = ((_g = (_f = this.socket) === null || _f === void 0 ? void 0 : _f.user) === null || _g === void 0 ? void 0 : _g.name) || null;
                    yield this.sessionManager.updateSessionStatus(this.sessionId, 'connected', phoneNumber || undefined, name || undefined);
                }
            }));
        });
    }
    sendMessage(to_1, content_1) {
        return __awaiter(this, arguments, void 0, function* (to, content, maxRetries = 5) {
            var _a, _b, _c, _d;
            if (!this.socket) {
                throw new Error('Socket not initialized');
            }
            const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
            // Special handling for LID accounts (WhatsApp Channels)
            // Note: Baileys has LIMITED support for @lid accounts due to tctoken authentication issues
            if (typeof content === 'string' && jid.includes('@lid')) {
                console.log(`[WhatsAppClient] ⚠️  Attempting to send to WhatsApp Channel (LID): ${jid}`);
                console.log(`[WhatsAppClient] Note: Channels have limited Baileys support. Message may not be delivered.`);
                // Try sending but don't fail the entire flow if it doesn't work
                try {
                    yield this.socket.sendMessage(jid, { text: content });
                    console.log(`[WhatsAppClient] ✓ TEXT sent to LID account ${jid}`);
                    return;
                }
                catch (error) {
                    // Known Baileys limitation with tctoken for channels
                    if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('tctoken')) {
                        console.error(`[WhatsAppClient] ✗ Cannot send to WhatsApp Channel ${jid}: Baileys does not fully support @lid accounts`);
                        console.error(`[WhatsAppClient] Recommendation: Use regular WhatsApp accounts (@s.whatsapp.net) for flows`);
                        // Don't throw - just log and return to prevent flow failure
                        return;
                    }
                    // For other errors, throw them
                    console.error(`[WhatsAppClient] ✗ Error sending to LID account:`, error.message);
                    throw error;
                }
            }
            // Backwards compatibility: string = text message
            const messageContent = typeof content === 'string' ? { type: 'text', text: content } : content;
            let lastError = null;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    // Build message payload based on type
                    let messagePayload;
                    switch (messageContent.type) {
                        case 'text':
                            messagePayload = { text: messageContent.text };
                            break;
                        case 'image':
                            messagePayload = {
                                image: { url: messageContent.url },
                                caption: messageContent.caption,
                            };
                            break;
                        case 'video':
                            messagePayload = {
                                video: { url: messageContent.url },
                                caption: messageContent.caption,
                            };
                            break;
                        case 'audio':
                            messagePayload = {
                                audio: { url: messageContent.url },
                                ptt: (_b = messageContent.ptt) !== null && _b !== void 0 ? _b : false,
                            };
                            break;
                        case 'document':
                            messagePayload = {
                                document: { url: messageContent.url },
                                fileName: messageContent.fileName,
                                mimetype: messageContent.mimetype || 'application/pdf',
                            };
                            break;
                        case 'location':
                            messagePayload = {
                                location: {
                                    degreesLatitude: messageContent.latitude,
                                    degreesLongitude: messageContent.longitude,
                                    name: messageContent.name,
                                    address: messageContent.address,
                                },
                            };
                            break;
                        case 'contact':
                            messagePayload = {
                                contacts: {
                                    displayName: 'Contact',
                                    contacts: [{ vcard: messageContent.vcard }],
                                },
                            };
                            break;
                        case 'poll':
                            messagePayload = {
                                poll: {
                                    name: messageContent.name,
                                    values: messageContent.options,
                                    selectableCount: messageContent.selectableCount || 1,
                                },
                            };
                            break;
                        case 'buttons':
                            // Try native flow interactive message with quick_reply buttons
                            const buttonsArray = messageContent.buttons.map((btn) => ({
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: btn.text,
                                    id: btn.id,
                                }),
                            }));
                            const nativeButtonPayload = {
                                viewOnceMessage: {
                                    message: {
                                        messageContextInfo: {
                                            deviceListMetadata: {},
                                            deviceListMetadataVersion: 2,
                                        },
                                        interactiveMessage: {
                                            body: {
                                                text: messageContent.text,
                                            },
                                            footer: messageContent.footer
                                                ? {
                                                    text: messageContent.footer,
                                                }
                                                : undefined,
                                            nativeFlowMessage: {
                                                buttons: buttonsArray,
                                            },
                                        },
                                    },
                                },
                            };
                            // Try native flow, fall back to simple text if it fails
                            try {
                                messagePayload = nativeButtonPayload;
                                console.log(`[WhatsAppClient] Attempting native flow buttons for ${jid}`);
                            }
                            catch (nativeError) {
                                console.warn(`[WhatsAppClient] ⚠️ Native flow buttons failed, using text fallback:`, nativeError.message);
                                // Fallback: Simple text with numbered options
                                let fallbackText = messageContent.text + '\n\n';
                                messageContent.buttons.forEach((btn, idx) => {
                                    fallbackText += `${idx + 1}. ${btn.text}\n`;
                                });
                                if (messageContent.footer) {
                                    fallbackText += `\n_${messageContent.footer}_`;
                                }
                                messagePayload = { text: fallbackText };
                            }
                            break;
                        case 'list':
                            // Try native flow interactive message with single_select list
                            const nativeListPayload = {
                                viewOnceMessage: {
                                    message: {
                                        messageContextInfo: {
                                            deviceListMetadata: {},
                                            deviceListMetadataVersion: 2,
                                        },
                                        interactiveMessage: {
                                            body: {
                                                text: messageContent.text,
                                            },
                                            footer: messageContent.footer
                                                ? {
                                                    text: messageContent.footer,
                                                }
                                                : undefined,
                                            nativeFlowMessage: {
                                                buttons: [
                                                    {
                                                        name: 'single_select',
                                                        buttonParamsJson: JSON.stringify({
                                                            title: messageContent.buttonText || 'Menu',
                                                            sections: messageContent.sections,
                                                        }),
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                            };
                            // Try native flow, fall back to simple text menu if it fails
                            try {
                                messagePayload = nativeListPayload;
                                console.log(`[WhatsAppClient] Attempting native flow list for ${jid}`);
                            }
                            catch (nativeError) {
                                console.warn(`[WhatsAppClient] ⚠️ Native flow list failed, using text fallback:`, nativeError.message);
                                // Fallback: Simple text menu with sections
                                let fallbackText = messageContent.text + '\n\n';
                                let optionNumber = 1;
                                messageContent.sections.forEach((section) => {
                                    fallbackText += `*${section.title}*\n`;
                                    section.rows.forEach((row) => {
                                        fallbackText += `${optionNumber}. ${row.title}`;
                                        if (row.description) {
                                            fallbackText += ` - ${row.description}`;
                                        }
                                        fallbackText += '\n';
                                        optionNumber++;
                                    });
                                    fallbackText += '\n';
                                });
                                if (messageContent.footer) {
                                    fallbackText += `_${messageContent.footer}_`;
                                }
                                messagePayload = { text: fallbackText };
                            }
                            break;
                        default:
                            throw new Error(`Unsupported message type: ${messageContent.type}`);
                    }
                    // Log outgoing message for debugging
                    console.log(`[WhatsAppClient] Sending ${messageContent.type} to ${jid}`, messageContent.type === 'list' || messageContent.type === 'buttons'
                        ? JSON.stringify(messagePayload, null, 2).substring(0, 500) + '...'
                        : '');
                    try {
                        yield this.socket.sendMessage(jid, messagePayload);
                    }
                    catch (sendError) {
                        // For buttons/lists, try fallback to simple text if native flow fails
                        if (messageContent.type === 'buttons' || messageContent.type === 'list') {
                            console.error(`[WhatsAppClient] ❌ Native flow ${messageContent.type} failed:`, sendError.message);
                            console.log(`[WhatsAppClient] 🔄 Retrying with text fallback...`);
                            // Build fallback text
                            let fallbackText = '';
                            if (messageContent.type === 'buttons') {
                                fallbackText = messageContent.text + '\n\n';
                                messageContent.buttons.forEach((btn, idx) => {
                                    fallbackText += `${idx + 1}. ${btn.text}\n`;
                                });
                                if (messageContent.footer) {
                                    fallbackText += `\n_${messageContent.footer}_`;
                                }
                            }
                            else if (messageContent.type === 'list') {
                                fallbackText = messageContent.text + '\n\n';
                                let optionNumber = 1;
                                messageContent.sections.forEach((section) => {
                                    fallbackText += `*${section.title}*\n`;
                                    section.rows.forEach((row) => {
                                        fallbackText += `${optionNumber}. ${row.title}`;
                                        if (row.description) {
                                            fallbackText += ` - ${row.description}`;
                                        }
                                        fallbackText += '\n';
                                        optionNumber++;
                                    });
                                    fallbackText += '\n';
                                });
                                if (messageContent.footer) {
                                    fallbackText += `_${messageContent.footer}_`;
                                }
                            }
                            // Send fallback text
                            yield this.socket.sendMessage(jid, { text: fallbackText });
                            console.log(`[WhatsAppClient] ✓ Fallback text sent successfully`);
                            return;
                        }
                        // For other message types, throw the error
                        console.error(`[WhatsAppClient] ❌ Failed to send ${messageContent.type} message:`, sendError.message);
                        console.error(`[WhatsAppClient] Error details:`, sendError);
                        throw sendError;
                    }
                    const typeLabel = messageContent.type.toUpperCase();
                    if (attempt > 1) {
                        console.log(`[WhatsAppClient] ✓ ${typeLabel} sent to ${jid} (after ${attempt - 1} retries)`);
                    }
                    else {
                        console.log(`[WhatsAppClient] ✓ ${typeLabel} sent to ${jid}`);
                    }
                    return;
                }
                catch (error) {
                    lastError = error;
                    const isSessionError = ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('SessionError')) || ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('No sessions'));
                    if (isSessionError && attempt < maxRetries) {
                        const delayMs = Math.pow(2, attempt - 1) * 1000; // Increased from 500ms to 1000ms base
                        console.log(`[WhatsAppClient] Attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs}ms...`);
                        yield new Promise((resolve) => setTimeout(resolve, delayMs));
                        continue;
                    }
                    if (isSessionError) {
                        console.error(`[WhatsAppClient] ✗ All ${maxRetries} attempts failed for ${jid}`);
                        throw new Error(`Cannot send message to ${to}: Encryption session not established after ${maxRetries} attempts.`);
                    }
                    throw error;
                }
            }
            throw lastError || new Error('Unknown error');
        });
    }
    getSocket() {
        return this.socket;
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.socket) {
                try {
                    this.socket.end(undefined);
                }
                catch (error) {
                    console.error('Error closing socket:', error);
                }
                this.socket = null;
            }
        });
    }
}
exports.WhatsAppClient = WhatsAppClient;
