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
exports.mongoose = exports.disconnectFromDatabase = exports.connectToDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.mongoose = mongoose_1.default;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'mongodb' });
let isConnected = false;
const connectToDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    if (isConnected) {
        logger.info('Using existing MongoDB connection');
        return;
    }
    const uri = process.env.DATABASE_URI;
    if (!uri) {
        throw new Error('DATABASE_URI environment variable is not set');
    }
    try {
        yield mongoose_1.default.connect(uri);
        isConnected = true;
        logger.info('✅ MongoDB connected successfully');
        mongoose_1.default.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
            isConnected = false;
        });
        mongoose_1.default.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
            isConnected = true;
        });
    }
    catch (error) {
        logger.error({ error });
        throw error;
    }
});
exports.connectToDatabase = connectToDatabase;
const disconnectFromDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!isConnected) {
        return;
    }
    try {
        yield mongoose_1.default.disconnect();
        isConnected = false;
        logger.info('MongoDB disconnected');
    }
    catch (error) {
        logger.error({ error });
        throw error;
    }
});
exports.disconnectFromDatabase = disconnectFromDatabase;
