'use client'

import React from 'react'
import FlowBuilder from '@/components/whatsapp/flow-builder/FlowBuilder'
import { useParams } from 'next/navigation'

export default function EditFlowPage() {
  const params = useParams()
  const id = params?.id as string

  return (
    <div className="h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Edit Flow</h1>
        <p className="text-sm text-gray-500">Modify your automation flow.</p>
      </div>
      <FlowBuilder flowId={id} />
    </div>
  )
}
