"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Test endpoint
app.get("/test", (req, res) => {
    res.json({ message: "Server is working!" });
});
// Sessions endpoint (without WhatsApp for now)
const sessions = [];
app.get("/sessions", (req, res) => {
    res.json({ sessions });
});
app.post("/session/start", (req, res) => {
    const { sessionId } = req.body;
    sessions.push({ sessionId, status: "pending" });
    res.json({ message: `Session ${sessionId} created` });
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`Test it: http://localhost:${PORT}/test`);
});
// Keep the process alive
process.on("SIGINT", () => {
    console.log("\n👋 Shutting down gracefully...");
    process.exit(0);
});
