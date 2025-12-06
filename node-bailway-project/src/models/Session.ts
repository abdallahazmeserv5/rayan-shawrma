import mongoose, { Schema, Document } from 'mongoose'

export interface ISession extends Document {
  id: string
  sessionId: string
  phoneNumber: string | null
  name: string | null
  creds: object
  keys: Record<string, unknown>
  status: 'connected' | 'disconnected' | 'pending'
  lastConnected: Date | null
  createdAt: Date
  updatedAt: Date
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    phoneNumber: { type: String, default: null },
    name: { type: String, default: null },
    creds: { type: Schema.Types.Mixed, default: {} },
    keys: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'pending'],
      default: 'pending',
    },
    lastConnected: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
)

// Index for fast lookups
SessionSchema.index({ sessionId: 1 }, { unique: true })
SessionSchema.index({ status: 1 })

export const Session = mongoose.model<ISession>('Session', SessionSchema)
