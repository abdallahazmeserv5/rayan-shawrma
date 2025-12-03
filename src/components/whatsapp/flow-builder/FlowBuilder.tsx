'use client'

import React, { useState, useCallback, useEffect } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MiniMap,
  Connection,
  Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import Sidebar from './Sidebar'
import { MessageNode } from './nodes/MessageNode'
import { StartNode } from './nodes/StartNode'
import { ConditionNode } from './nodes/ConditionNode'
import { DelayNode } from './nodes/DelayNode'
import { HttpRequestNode } from './nodes/HttpRequestNode'
import { EmailNode } from './nodes/EmailNode'
import { QuestionNode } from './nodes/QuestionNode'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Save } from 'lucide-react'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

const nodeTypes = {
  message: MessageNode,
  start: StartNode,
  question: QuestionNode,
  condition: ConditionNode,
  delay: DelayNode,
  http: HttpRequestNode,
  email: EmailNode,
}

const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 5 },
    data: { label: 'Start Flow' },
  },
]

const FlowBuilderCanvas = ({ flowId }: { flowId?: string }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [flowName, setFlowName] = useState('My Flow')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!flowId)

  useEffect(() => {
    if (flowId) {
      fetchFlowData()
    }
  }, [flowId])

  const fetchFlowData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/flows/${flowId}`)
      if (!response.ok) throw new Error('Failed to fetch flow')
      const data = await response.json()

      setFlowName(data.name)
      if (data.nodes) setNodes(data.nodes)
      if (data.edges) setEdges(data.edges)
    } catch (error) {
      console.error('Error fetching flow:', error)
      toast.error('Failed to load flow data')
    } finally {
      setLoading(false)
    }
  }

  const validateFlow = useCallback(() => {
    // Check if there's at least one start node
    const hasStart = nodes.some((n) => n.type === 'start')
    if (!hasStart) {
      return 'Flow must have a Start node'
    }

    // Check for disconnected nodes (except start)
    const connectedNodeIds = new Set<string>()
    edges.forEach((edge) => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    const disconnectedNodes = nodes.filter((n) => n.type !== 'start' && !connectedNodeIds.has(n.id))

    if (disconnectedNodes.length > 0) {
      return `Warning: ${disconnectedNodes.length} disconnected node(s)`
    }

    return null
  }, [nodes, edges])

  const onSave = useCallback(async () => {
    if (!reactFlowInstance) return

    // Validate flow
    const validationError = validateFlow()
    if (validationError && validationError.startsWith('Flow must')) {
      toast.error(validationError)
      return
    }

    if (validationError) {
      toast.warning(validationError)
    }

    const flow = reactFlowInstance.toObject()
    setSaving(true)

    try {
      const url = flowId
        ? `${WHATSAPP_SERVICE_URL}/api/flows/${flowId}`
        : `${WHATSAPP_SERVICE_URL}/api/flows`

      const method = flowId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          nodes: flow.nodes,
          edges: flow.edges,
          triggerType: 'keyword', // Default for now
          keywords: ['hello', 'hi'], // Default for now
        }),
      })

      if (!response.ok) throw new Error('Failed to save flow')

      toast.success('Flow saved successfully!')
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(`Failed to save: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }, [reactFlowInstance, flowName, validateFlow, flowId])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')

      if (typeof type === 'undefined' || !type) {
        return
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node` },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Flow name"
            className="w-64"
          />
          <span className="text-xs text-gray-500">Press Delete to remove selected nodes/edges</span>
        </div>
        <Button onClick={onSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Flow
            </>
          )}
        </Button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 h-full bg-gray-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode="Delete"
          >
            <Controls />
            <MiniMap />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}

export default function FlowBuilder({ flowId }: { flowId?: string }) {
  return (
    <ReactFlowProvider>
      <FlowBuilderCanvas flowId={flowId} />
    </ReactFlowProvider>
  )
}
