'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Play, Pause, Edit, Trash2, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

interface Flow {
  _id: string
  name: string
  isActive: boolean
  triggerType: string
  keywords: string[]
  sessionId?: string | null
  createdAt: string
}

interface Session {
  sessionId: string
  status: string
}

export default function FlowListPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchFlows()
    fetchSessions()
  }, [])

  const fetchFlows = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/flows`)
      const data = await response.json()
      setFlows(data)
    } catch (error) {
      console.error('Failed to fetch flows:', error)
      toast.error('Failed to load flows')
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/sessions`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }
  }

  const handleToggleFlow = async (flowId: string) => {
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/flows/${flowId}/toggle`, {
        method: 'POST',
      })
      fetchFlows()
      toast.success('Flow status updated')
    } catch (error) {
      console.error('Failed to toggle flow:', error)
      toast.error('Failed to update flow status')
    }
  }

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm('Are you sure you want to delete this flow?')) return

    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/flows/${flowId}`, {
        method: 'DELETE',
      })
      fetchFlows()
      toast.success('Flow deleted successfully')
    } catch (error) {
      console.error('Failed to delete flow:', error)
      toast.error('Failed to delete flow')
    }
  }

  const handleSessionAssignment = async (flowId: string, sessionId: string) => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId === '__none__' ? null : sessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign session')
      }

      fetchFlows()
      toast.success('Session assigned successfully')
    } catch (error: any) {
      console.error('Failed to assign session:', error)
      toast.error(error.message || 'Failed to assign session')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation Flows</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage automated conversation flows
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchFlows} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/admin/whatsapp/flows/create">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Flow
            </Button>
          </Link>
        </div>
      </div>

      {flows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center">
            <div className="p-4 bg-indigo-50 rounded-full mb-4">
              <Zap className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No flows created yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm">
              Automation flows allow you to build interactive chatbots and auto-responders.
            </p>
            <Link href="/admin/whatsapp/flows/create">
              <Button className="bg-indigo-600 hover:bg-indigo-700">Create Your First Flow</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {flows.map((flow) => (
            <Card key={flow._id} className="overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <Zap className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">{flow.name}</h3>
                      <Badge
                        variant={flow.isActive ? 'default' : 'secondary'}
                        className={
                          flow.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }
                      >
                        {flow.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 space-y-1">
                      <p>Trigger: {flow.triggerType}</p>
                      {flow.keywords && flow.keywords.length > 0 && (
                        <p>Keywords: {flow.keywords.join(', ')}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Label className="text-xs text-gray-600">Session:</Label>
                        <Select
                          value={flow.sessionId || '__none__'}
                          onValueChange={(v) => handleSessionAssignment(flow._id, v)}
                        >
                          <SelectTrigger className="w-48 h-8">
                            <SelectValue placeholder="No session" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No session</SelectItem>
                            {sessions.map((s) => (
                              <SelectItem key={s.sessionId} value={s.sessionId}>
                                {s.sessionId} {s.status === 'connected' ? '✓' : '○'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleFlow(flow._id)}
                    className={
                      flow.isActive
                        ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
                        : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                    }
                  >
                    {flow.isActive ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Enable
                      </>
                    )}
                  </Button>
                  <Link href={`/admin/whatsapp/flows/${flow._id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFlow(flow._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
