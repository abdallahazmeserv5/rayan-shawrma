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
import { ButtonNode } from './nodes/ButtonNode'
import { ListNode } from './nodes/ListNode'
import { MenuResponseNode } from './nodes/MenuResponseNode'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Commented out - only needed if you uncomment trigger/keyword selectors
// import { Label } from '@/components/ui/label'
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select'
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
  buttons: ButtonNode,
  list: ListNode,
  menuResponse: MenuResponseNode,
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
  const [keywords, setKeywords] = useState<string>('hello, hi')
  const [triggerType, setTriggerType] = useState<'keyword' | 'message' | 'event'>('keyword')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!flowId)

  useEffect(() => {
    if (flowId) {
      // Edit mode - fetch existing flow data
      fetchFlowData()
    } else {
      // Create mode - reset to initial/default state
      setNodes(initialNodes)
      setEdges([])
      setFlowName('My Flow')
      setKeywords('')
      setTriggerType('message') // Default to 'message' = respond to any message
      setSessionId(null)
      setLoading(false)
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
      if (data.keywords) setKeywords(data.keywords.join(', '))
      if (data.triggerType) setTriggerType(data.triggerType)
      if (data.sessionId !== undefined) setSessionId(data.sessionId)
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

    // Parse keywords from comma-separated string (only used if keyword trigger is selected)
    const keywordsArray = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    // Removed keyword requirement - now flows respond to any message by default
    // if (triggerType === 'keyword' && keywordsArray.length === 0) {
    //   toast.error('Please enter at least one trigger keyword')
    //   return
    // }

    const flow = reactFlowInstance.toObject()
    setSaving(true)

    try {
      const { apiFetch } = await import('@/lib/api')
      const url = flowId
        ? `${WHATSAPP_SERVICE_URL}/api/flows/${flowId}`
        : `${WHATSAPP_SERVICE_URL}/api/flows`

      const method = flowId ? 'PUT' : 'POST'

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          nodes: flow.nodes,
          edges: flow.edges,
          triggerType: triggerType,
          keywords: keywordsArray,
          sessionId: sessionId,
        }),
      })

      // If apiFetch succeeds, response is OK
      await response.json()
      toast.success('Flow saved successfully!')
    } catch (error: any) {
      // Error toast already shown by apiFetch
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }, [reactFlowInstance, flowName, keywords, triggerType, sessionId, validateFlow, flowId])

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
      <div className="flex flex-col gap-3 p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              placeholder="Flow name"
              className="w-48"
            />

            {/* Hidden trigger type - always set to 'message' for simplicity */}
            {/* Uncomment below if you want to show trigger selection */}
            {/*
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500 whitespace-nowrap">Trigger:</Label>
              <Select
                value={triggerType}
                onValueChange={(v: 'keyword' | 'message' | 'event') => setTriggerType(v)}
              >
                <SelectTrigger className="w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="message">Any Message</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {triggerType === 'keyword' && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-500 whitespace-nowrap">Keywords:</Label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="hi, hello, hey (comma-separated)"
                  className="w-56"
                />
              </div>
            )}
            */}
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
        <span className="text-xs text-gray-500">
          Drag nodes from the sidebar. Connect Start to Message nodes. Press Delete to remove.
        </span>
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
  // Using key prop to force remount when flowId changes (especially from edit to create)
  return (
    <ReactFlowProvider>
      <FlowBuilderCanvas key={flowId || 'new'} flowId={flowId} />
    </ReactFlowProvider>
  )
}
