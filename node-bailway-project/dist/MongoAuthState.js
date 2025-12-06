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
exports.getMongoDBAuthState = getMongoDBAuthState;
const baileys_1 = require("@whiskeysockets/baileys");
const Session_1 = require("./models/Session");
/**
 * Custom Baileys auth state adapter that stores credentials in MongoDB
 * instead of the file system.
 */
function getMongoDBAuthState(sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find or create the session document
        let session = yield Session_1.Session.findOne({ sessionId });
        if (!session) {
            // Create new session with initial credentials
            const creds = (0, baileys_1.initAuthCreds)();
            session = new Session_1.Session({
                sessionId,
                creds: JSON.parse(JSON.stringify(creds, baileys_1.BufferJSON.replacer)),
                keys: {},
                status: 'pending',
            });
            yield session.save();
        }
        // Parse stored credentials
        const creds = JSON.parse(JSON.stringify(session.creds), baileys_1.BufferJSON.reviver);
        const saveCreds = () => __awaiter(this, void 0, void 0, function* () {
            yield Session_1.Session.updateOne({ sessionId }, {
                $set: {
                    creds: JSON.parse(JSON.stringify(creds, baileys_1.BufferJSON.replacer)),
                },
            });
        });
        // CRITICAL: Keep keys in memory to avoid race conditions
        // The old file-based system kept keys in memory and only wrote to disk
        // We need to do the same with MongoDB to prevent read/write race conditions
        const keysCache = Object.assign({}, (session.keys || {}));
        const state = {
            creds,
            keys: {
                get: (type, ids) => __awaiter(this, void 0, void 0, function* () {
                    const data = {};
                    // Read from in-memory cache (like the old file system did)
                    for (const id of ids) {
                        const key = `${type}-${id}`;
                        if (keysCache[key]) {
                            try {
                                data[id] = JSON.parse(JSON.stringify(keysCache[key]), baileys_1.BufferJSON.reviver);
                            }
                            catch (_a) {
                                data[id] = keysCache[key];
                            }
                        }
                    }
                    return data;
                }),
                set: (data) => __awaiter(this, void 0, void 0, function* () {
                    const updates = {};
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            // Update in-memory cache IMMEDIATELY (critical!)
                            if (value) {
                                keysCache[key] = value;
                                updates[`keys.${key}`] = JSON.parse(JSON.stringify(value, baileys_1.BufferJSON.replacer));
                            }
                            else {
                                delete keysCache[key];
                                updates[`keys.${key}`] = undefined;
                            }
                        }
                    }
                    // Save to MongoDB asynchronously (don't block on this)
                    const setOps = {};
                    const unsetOps = {};
                    for (const [key, value] of Object.entries(updates)) {
                        if (value === undefined) {
                            unsetOps[key] = '';
                        }
                        else {
                            setOps[key] = value;
                        }
                    }
                    const updateQuery = {};
                    if (Object.keys(setOps).length > 0) {
                        updateQuery.$set = setOps;
                    }
                    if (Object.keys(unsetOps).length > 0) {
                        updateQuery.$unset = unsetOps;
                    }
                    if (Object.keys(updateQuery).length > 0) {
                        // Save to MongoDB in background - don't await to prevent blocking
                        Session_1.Session.updateOne({ sessionId }, updateQuery).catch((err) => {
                            console.error(`[MongoAuthState] Error saving keys to MongoDB:`, err);
                        });
                    }
                }),
            },
        };
        return { state, saveCreds };
    });
}
