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
exports.createCampaignRoutes = void 0;
const express_1 = __importDefault(require("express"));
const createCampaignRoutes = (campaignManager) => {
    const router = express_1.default.Router();
    // Get all campaigns
    router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const campaigns = yield campaignManager.getAllCampaigns();
            res.json(campaigns);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Get campaign by ID
    router.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const campaign = yield campaignManager.getCampaignById(req.params.id);
            if (!campaign) {
                return res.status(404).json({ error: "Campaign not found" });
            }
            res.json(campaign);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Create new campaign
    router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, template, contacts, scheduledStart, scheduledEnd, timeWindowStart, timeWindowEnd, minDelay, maxDelay, enableTyping, senderIds, } = req.body;
            if (!name || !template || !contacts || !Array.isArray(contacts)) {
                return res.status(400).json({
                    error: "Name, template, and contacts array are required",
                });
            }
            const campaign = yield campaignManager.createCampaign({
                name,
                template,
                contacts,
                scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
                scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
                timeWindowStart,
                timeWindowEnd,
                minDelay,
                maxDelay,
                enableTyping,
                senderIds,
            });
            res.status(201).json(campaign);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Start campaign
    router.post("/:id/start", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield campaignManager.startCampaign(req.params.id);
            res.json({ success: true, message: "Campaign started" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Pause campaign
    router.post("/:id/pause", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield campaignManager.pauseCampaign(req.params.id);
            res.json({ success: true, message: "Campaign paused" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Resume campaign
    router.post("/:id/resume", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield campaignManager.resumeCampaign(req.params.id);
            res.json({ success: true, message: "Campaign resumed" });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Delete campaign
    router.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield campaignManager.deleteCampaign(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    // Get campaign stats
    router.get("/:id/stats", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const stats = yield campaignManager.getCampaignStats(req.params.id);
            if (!stats) {
                return res.status(404).json({ error: "Campaign not found" });
            }
            res.json(stats);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }));
    return router;
};
exports.createCampaignRoutes = createCampaignRoutes;
