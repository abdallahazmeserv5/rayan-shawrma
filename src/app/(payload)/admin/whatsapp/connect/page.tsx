'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Plus, RefreshCw, Trash2, QrCode, CheckCircle2, XCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

interface Session {
  sessionId: string
  phoneNumber?: string | null
  name?: string | null
  status: string
  lastConnected?: Date | null
}

export default function SessionsManagementPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingSession, setConnectingSession] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [newSessionId, setNewSessionId] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/sessions`, {
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      toast.error('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    if (!newSessionId.trim()) {
      toast.error('Please enter a session ID')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: newSessionId }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create session')
      }

      setCreateDialogOpen(false)
      setNewSessionId('')
      setConnectingSession(newSessionId)

      // Poll for QR code
      pollForQR(newSessionId)
      toast.success('Session created! Waiting for QR code...')
    } catch (error: any) {
      console.error('Error creating session:', error)
      if (error.name === 'TimeoutError') {
        toast.error('Connection timeout. Please check if WhatsApp service is running.')
      } else {
        toast.error(error.message || 'Failed to create session')
      }
    } finally {
      setLoading(false)
    }
  }

  const pollForQR = async (sessionId: string) => {
    let attempts = 0
    const maxAttempts = 60

    const poll = async () => {
      try {
        const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/${sessionId}/qr`, {
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.qr) {
            setQrCode(data.qr)
            // Start polling for connection
            pollForConnection(sessionId)
            return
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000)
        } else {
          toast.error('QR code generation timeout')
          setConnectingSession(null)
        }
      } catch (error) {
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000)
        }
      }
    }

    poll()
  }

  const pollForConnection = (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/${sessionId}/status`)
        const data = await response.json()

        if (data.status === 'connected') {
          setQrCode(null)
          setConnectingSession(null)
          clearInterval(interval)
          fetchSessions()
          toast.success('Session connected successfully!')
        }
      } catch (error) {
        console.error('Error polling connection:', error)
      }
    }, 2000)

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000)
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(`Are you sure you want to delete session "${sessionId}"?`)) return

    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchSessions()
        toast.success('Session deleted successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete session')
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error('Failed to delete session')
    }
  }

  const handleReconnect = async (sessionId: string) => {
    try {
      setConnectingSession(sessionId)
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/sessions/${sessionId}/reconnect`, {
        method: 'POST',
      })

      if (response.ok) {
        pollForQR(sessionId)
        toast.success('Reconnecting...')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to reconnect')
        setConnectingSession(null)
      }
    } catch (error) {
      console.error('Error reconnecting:', error)
      toast.error('Failed to reconnect')
      setConnectingSession(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your WhatsApp connections and sessions
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchSessions} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Enter a unique session ID for your new WhatsApp connection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sessionId">Session ID</Label>
                  <Input
                    id="sessionId"
                    placeholder="e.g., sales_bot, support_team"
                    value={newSessionId}
                    onChange={(e) => setNewSessionId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
                  />
                </div>
                <Button onClick={handleCreateSession} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Session'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* QR Code Dialog */}
      {qrCode && (
        <Dialog open={!!qrCode} onOpenChange={() => setQrCode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </DialogTitle>
              <DialogDescription>
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-4">
              <QRCodeSVG
                value={qrCode}
                size={256}
                level="M"
                className="rounded-lg border p-4 bg-white"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Sessions List */}
      {sessions.length === 0 && !loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-indigo-50 rounded-full mb-4 inline-block">
              <QrCode className="h-8 w-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create your first WhatsApp session to start sending messages
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Create Your First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.sessionId}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <QrCode className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900">{session.sessionId}</h3>
                      <Badge
                        variant={session.status === 'connected' ? 'default' : 'secondary'}
                        className={
                          session.status === 'connected'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }
                      >
                        {session.status === 'connected' ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Connected
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-1 h-3 w-3" />
                            Disconnected
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 space-y-1">
                      {session.phoneNumber && <p>Phone: {session.phoneNumber}</p>}
                      {session.lastConnected && (
                        <p>Last connected: {new Date(session.lastConnected).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {session.status === 'disconnected' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReconnect(session.sessionId)}
                      disabled={connectingSession === session.sessionId}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      {connectingSession === session.sessionId ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSession(session.sessionId)}
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
