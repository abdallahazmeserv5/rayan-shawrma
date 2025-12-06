"use strict";
/**
 * Utility functions for WhatsApp automation
 */
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
exports.chunkArray = chunkArray;
exports.normalizePhoneNumber = normalizePhoneNumber;
exports.retryWithBackoff = retryWithBackoff;
exports.isValidPhoneNumber = isValidPhoneNumber;
exports.parsePhoneNumbers = parsePhoneNumbers;
/**
 * Split an array into chunks of specified size
 * @param array - Array to chunk
 * @param size - Maximum size of each chunk
 * @returns Array of chunks
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
/**
 * Normalize phone number to WhatsApp JID format
 * @param phoneNumber - Phone number (with or without country code)
 * @returns WhatsApp JID (e.g., "1234567890@s.whatsapp.net")
 */
function normalizePhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, "");
    // Return in WhatsApp JID format
    return `${cleaned}@s.whatsapp.net`;
}
/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param retries - Number of retry attempts
 * @param delayMs - Initial delay in milliseconds
 * @returns Result of the function
 */
function retryWithBackoff(fn_1) {
    return __awaiter(this, arguments, void 0, function* (fn, retries = 3, delayMs = 1000) {
        try {
            return yield fn();
        }
        catch (error) {
            if (retries <= 0) {
                throw error;
            }
            // Wait with exponential backoff
            yield new Promise((resolve) => setTimeout(resolve, delayMs));
            // Retry with doubled delay
            return retryWithBackoff(fn, retries - 1, delayMs * 2);
        }
    });
}
/**
 * Validate phone number format
 * @param phoneNumber - Phone number to validate
 * @returns true if valid, false otherwise
 */
function isValidPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");
    // Must be between 10 and 15 digits
    return cleaned.length >= 10 && cleaned.length <= 15;
}
/**
 * Parse phone numbers from text (one per line)
 * @param text - Text containing phone numbers
 * @returns Array of valid phone numbers
 */
function parsePhoneNumbers(text) {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && isValidPhoneNumber(line));
}
