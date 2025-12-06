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
exports.createSenderRoutes = void 0;
const express_1 = __importDefault(require("express"));
const createSenderRoutes = (senderManager) => {
    const router = express_1.default.Router();
    // Get all senders
    router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("GET /api/senders - Fetching all senders...");
            const senders = yield senderManager.getAllSenders();
            console.log("GET /api/senders - Found senders:", senders.length);
            res.json(senders);
        }
        catch (error) {
            console.error("GET /api/senders - Error:", error);
            res.status(500).json({ error: error.message });
        }
    }));
    // Get active senders
    router.get("/active", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const senders = yield senderManager.getActiveSenders();
            res.json(senders);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Get sender by ID
    router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const sender = yield senderManager.getSenderById(req.params.id);
            if (!sender) {
                return res.status(404).json({ error: "Sender not found" });
            }
            res.json(sender);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Create new sender
    router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, phoneNumber, quotaPerMinute, quotaPerHour, quotaPerDay } = req.body;
            if (!name || !phoneNumber) {
                return res
                    .status(400)
                    .json({ error: "Name and phone number are required" });
            }
            const sender = yield senderManager.createSender({
                name,
                phoneNumber,
                quotaPerMinute,
                quotaPerHour,
                quotaPerDay,
            });
            res.status(201).json(sender);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Delete sender
    router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield senderManager.deleteSender(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Get sender stats
    router.get("/:id/stats", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const stats = yield senderManager.getSenderStats(req.params.id);
            if (!stats) {
                return res.status(404).json({ error: "Sender not found" });
            }
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Connect sender
    router.post("/:id/connect", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield senderManager.connectSender(req.params.id);
            res.json({ success: true, message: "Connection process started" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Get QR code
    router.get("/:id/qr", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const qr = senderManager.getQrCode(req.params.id);
            if (!qr) {
                return res
                    .status(404)
                    .json({ error: "QR code not found or already connected" });
            }
            res.json({ qr });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    return router;
};
exports.createSenderRoutes = createSenderRoutes;
