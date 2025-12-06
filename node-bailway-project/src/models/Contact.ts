import mongoose, { Schema, Document } from 'mongoose'

export interface IContact extends Document {
  id: string
  phoneNumber: string
  whatsappId?: string // Full WhatsApp JID (e.g., 123@lid or 123@s.whatsapp.net)
  name: string | null
  customAttributes: Record<string, any>
  isAutoReplyDisabled: boolean
  autoReplyDisabledUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

const ContactSchema = new Schema<IContact>(
  {
    phoneNumber: { type: String, required: true, unique: true },
    whatsappId: { type: String, default: null }, // Store full JID for WhatsApp Channels (LID)
    name: { type: String, default: null },
    customAttributes: { type: Schema.Types.Mixed, default: {} },
    isAutoReplyDisabled: { type: Boolean, default: false },
    autoReplyDisabledUntil: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
)

export const Contact = mongoose.model<IContact>('Contact', ContactSchema)
