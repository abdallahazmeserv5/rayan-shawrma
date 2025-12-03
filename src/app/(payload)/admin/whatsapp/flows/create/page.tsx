'use client'

import React from 'react'
import FlowBuilder from '@/components/whatsapp/flow-builder/FlowBuilder'

export default function CreateFlowPage() {
  return (
    <div className="h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Create New Flow</h1>
        <p className="text-sm text-gray-500">
          Design your automation flow by dragging and dropping nodes.
        </p>
      </div>
      <FlowBuilder />
    </div>
  )
}
