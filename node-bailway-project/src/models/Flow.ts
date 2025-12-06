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

// Auto-cleanup: Remove problematic unique index if it exists
// This runs once when the model is loaded
;(async () => {
  try {
    // Wait for mongoose connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise<void>((resolve) => {
        mongoose.connection.once('connected', resolve)
      })
    }

    const collection = mongoose.connection.db?.collection('flows')
    if (!collection) return

    const indexes = await collection.indexes().catch(() => [])
    const uniqueSessionIdIndex = indexes.find(
      (idx: any) => idx.key?.sessionId && idx.unique === true,
    )

    if (uniqueSessionIdIndex && uniqueSessionIdIndex.name) {
      console.log(
        `[Flow Model] ⚠️  Dropping problematic unique index: ${uniqueSessionIdIndex.name}`,
      )
      await collection.dropIndex(uniqueSessionIdIndex.name)
      console.log(`[Flow Model] ✅ Index dropped successfully`)
    }
  } catch (_ignore) {
    // Silently ignore - collection may not exist yet
  }
})()
