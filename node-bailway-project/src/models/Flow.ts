import mongoose, { Schema, Document } from 'mongoose'

export type FlowTriggerType = 'keyword' | 'message' | 'event'

export interface IFlow extends Document {
  id: string
  name: string
  description: string | null
  triggerType: FlowTriggerType
  keywords: string[] | null
  sessionId: string | null // WhatsApp session assigned to this flow
  nodes: any[]
  edges: any[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const FlowSchema = new Schema<IFlow>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    triggerType: {
      type: String,
      enum: ['keyword', 'message', 'event'],
      required: true,
    },
    keywords: { type: [String], default: null },
    sessionId: { type: String, default: null }, // Session assigned to this flow
    nodes: { type: Schema.Types.Mixed, required: true },
    edges: { type: Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
)

// Create a sparse index on sessionId for faster queries
// sparse: only index documents that have sessionId field
// Removed unique constraint to allow multiple flows with the same sessionId or null
FlowSchema.index({ sessionId: 1 }, { sparse: true })

export const Flow = mongoose.model<IFlow>('Flow', FlowSchema)
