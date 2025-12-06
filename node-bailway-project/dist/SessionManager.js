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
exports.SessionManager = void 0;
const MongoAuthState_1 = require("./MongoAuthState");
const Session_1 = require("./models/Session");
class SessionManager {
    constructor() { }
    getAuthState(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { state, saveCreds } = yield (0, MongoAuthState_1.getMongoDBAuthState)(sessionId);
            return { state, saveCreds };
        });
    }
    deleteSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Session_1.Session.deleteOne({ sessionId });
        });
    }
    updateSessionStatus(sessionId, status, phoneNumber, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const update = { status };
            if (status === 'connected') {
                update.lastConnected = new Date();
            }
            if (phoneNumber) {
                update.phoneNumber = phoneNumber;
            }
            if (name) {
                update.name = name;
            }
            yield Session_1.Session.updateOne({ sessionId }, { $set: update });
        });
    }
    getAllSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            return Session_1.Session.find().sort({ createdAt: -1 });
        });
    }
    getSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Session_1.Session.findOne({ sessionId });
        });
    }
}
exports.SessionManager = SessionManager;
