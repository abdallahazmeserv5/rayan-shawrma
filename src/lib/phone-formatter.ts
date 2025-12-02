import { parsePhoneNumber, type PhoneNumber } from 'libphonenumber-js'

/**
 * Formats a phone number for WhatsApp
 * @param phoneInput - Phone number with country code (e.g., +1234567890)
 * @returns WhatsApp formatted number (e.g., 1234567890@s.whatsapp.net)
 * @throws Error if phone number is invalid
 */
export function formatPhoneForWhatsApp(phoneInput: string): string {
  try {
    // Parse and validate the phone number
    const phoneNumber: PhoneNumber = parsePhoneNumber(phoneInput)

    if (!phoneNumber.isValid()) {
      throw new Error('Invalid phone number')
    }

    // Convert to WhatsApp format: remove + sign and add @s.whatsapp.net
    // Example: +1234567890 → 1234567890@s.whatsapp.net
    const number = phoneNumber.number.replace('+', '')
    return `${number}@s.whatsapp.net`
  } catch (error) {
    throw new Error(
      `Invalid phone number format. Please use international format with country code (e.g., +1234567890). Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Validates a phone number
 * @param phoneInput - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phoneInput: string): boolean {
  try {
    const phoneNumber = parsePhoneNumber(phoneInput)
    return phoneNumber.isValid()
  } catch {
    return false
  }
}

/**
 * Formats a phone number for display
 * @param phoneInput - Phone number to format
 * @returns Formatted phone number in international format
 */
export function formatPhoneForDisplay(phoneInput: string): string {
  try {
    const phoneNumber = parsePhoneNumber(phoneInput)
    return phoneNumber.formatInternational()
  } catch {
    return phoneInput
  }
}
