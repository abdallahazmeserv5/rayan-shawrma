import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.WHATSAPP_ENCRYPTION_KEY || ''
const ALGORITHM = 'aes-256-cbc'

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  console.warn(
    'WARNING: WHATSAPP_ENCRYPTION_KEY must be exactly 32 characters. Session encryption may fail.',
  )
}

/**
 * Encrypts text using AES-256-CBC encryption
 * @param text - Plain text to encrypt
 * @returns Encrypted text in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('WHATSAPP_ENCRYPTION_KEY must be exactly 32 characters')
  }

  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

/**
 * Decrypts text that was encrypted with the encrypt function
 * @param text - Encrypted text in format: iv:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('WHATSAPP_ENCRYPTION_KEY must be exactly 32 characters')
  }

  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encrypted = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}
