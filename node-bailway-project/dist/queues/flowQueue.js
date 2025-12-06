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
exports.flowQueue = void 0;
exports.startFlowWorker = startFlowWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const enableRedis = process.env.ENABLE_REDIS === "true";
// create the connection only if enabled
const connection = enableRedis
    ? new ioredis_1.default({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        maxRetriesPerRequest: null,
    })
    : null;
// ---- QUEUE ---- //
exports.flowQueue = enableRedis
    ? new bullmq_1.Queue("flow-execution", { connection: connection })
    : null;
// ---- WORKER ---- //
function startFlowWorker(executeNodeCallback) {
    if (!enableRedis) {
        console.log("Redis disabled — worker not started.");
        return null;
    }
    const worker = new bullmq_1.Worker("flow-execution", (job) => __awaiter(this, void 0, void 0, function* () {
        const { executionId, nodeId } = job.data;
        console.log(`Processing delayed node execution: ${executionId} - ${nodeId}`);
        yield executeNodeCallback(executionId, nodeId);
    }), { connection: connection });
    worker.on("completed", (job) => {
        console.log(`Job ${job.id} completed`);
    });
    worker.on("failed", (job, err) => {
        console.error(`Job ${job === null || job === void 0 ? void 0 : job.id} failed:`, err);
    });
    return worker;
}
