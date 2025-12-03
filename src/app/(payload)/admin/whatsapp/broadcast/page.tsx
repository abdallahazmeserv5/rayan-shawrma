'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Plus, Trash2, Send, Upload, Info } from 'lucide-react'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

interface Session {
  sessionId: string
  status: string
}

interface BroadcastList {
  id: string
  name: string
  sessionId: string
  totalMembers: number
  groups: any[]
  createdAt: string
}

export default function BroadcastManagerPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [broadcasts, setBroadcasts] = useState<BroadcastList[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastList | null>(null)
  const [loading, setLoading] = useState(false)

  // Create modal state
  const [selectedSession, setSelectedSession] = useState('')
  const [broadcastName, setBroadcastName] = useState('')
  const [numbers, setNumbers] = useState('')

  // Send modal state
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchSessions()
    fetchBroadcasts()
  }, [])

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/sessions`)
      const data = await response.json()
      setSessions(data.sessions || [])
      const connected = data.sessions?.find((s: Session) => s.status === 'connected')
      if (connected) {
        setSelectedSession(connected.sessionId)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      toast.error('Failed to fetch sessions')
    }
  }

  const fetchBroadcasts = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/broadcast`)
      const data = await response.json()
      setBroadcasts(data.broadcasts || [])
    } catch (error) {
      console.error('Failed to fetch broadcasts:', error)
      toast.error('Failed to fetch broadcasts')
    }
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      let extractedNumbers: string[] = []

      if (file.name.endsWith('.csv')) {
        extractedNumbers = text
          .split('\n')
          .flatMap((line) => line.split(','))
          .map((cell) => cell.trim().replace(/['"]/g, ''))
          .filter((cell) => /^\d+$/.test(cell))
      } else if (file.name.endsWith('.txt')) {
        extractedNumbers = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => /^\d+$/.test(line))
      } else {
        toast.error('Unsupported file type. Please use .csv or .txt files.')
        return
      }

      if (extractedNumbers.length === 0) {
        toast.error('No valid phone numbers found in the file.')
        return
      }

      setNumbers(extractedNumbers.join('\n'))
      toast.success(`Imported ${extractedNumbers.length} numbers from ${file.name}`)
      e.target.value = ''
    } catch (error: any) {
      toast.error(`Error importing file: ${error.message}`)
    }
  }

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSession || !broadcastName || !numbers) {
      toast.error('Please fill in all fields')
      return
    }

    const numberList = numbers
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)

    if (numberList.length === 0) {
      toast.error('Please enter at least one phone number')
      return
    }

    if (numberList.length > 256) {
      toast.error(
        `WhatsApp broadcast lists support a maximum of 256 contacts. Please remove ${numberList.length - 256} contact(s).`,
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession,
          name: broadcastName,
          numbers: numberList,
        }),
      })

      if (!response.ok) throw new Error('Failed to create broadcast')

      toast.success('Broadcast list created successfully!')
      setShowCreateModal(false)
      setBroadcastName('')
      setNumbers('')
      fetchBroadcasts()
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSendToBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBroadcast || !sendMessage) {
      toast.error('Please enter a message')
      return
    }

    setSending(true)

    try {
      const response = await fetch(
        `${WHATSAPP_SERVICE_URL}/api/broadcast/${selectedBroadcast.id}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: sendMessage }),
        },
      )

      if (!response.ok) throw new Error('Failed to send message')

      const result = await response.json()
      toast.success(
        `Message sent to ${result.groupsSent} groups (${result.totalRecipients} recipients)!`,
      )
      setShowSendModal(false)
      setSendMessage('')
      setSelectedBroadcast(null)
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleDeleteBroadcast = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }

    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/broadcast/${id}`, {
        method: 'DELETE',
      })
      toast.success('Broadcast list deleted successfully!')
      fetchBroadcasts()
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const numberListCount = numbers.split('\n').filter((n) => n.trim()).length
  const groupCount = Math.ceil(numberListCount / 256)

  const connectedSessions = sessions.filter((s) => s.status === 'connected')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Manager</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage broadcast lists (max 256 contacts per group)
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Broadcast List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Broadcast List</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBroadcast} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Session</Label>
                <Select
                  value={selectedSession}
                  onValueChange={setSelectedSession}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedSessions.map((session) => (
                      <SelectItem key={session.sessionId} value={session.sessionId}>
                        {session.sessionId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Broadcast Name</Label>
                <Input
                  value={broadcastName}
                  onChange={(e) => setBroadcastName(e.target.value)}
                  placeholder="e.g., Promo Jan 2025"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Phone Numbers (one per line)</Label>
                  <div>
                    <Input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileImport}
                      className="hidden"
                      id="file-import"
                      disabled={loading}
                    />
                    <Label
                      htmlFor="file-import"
                      className={`cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="mr-2 h-3 w-3" />
                      Import CSV/TXT
                    </Label>
                  </div>
                </div>
                <Textarea
                  value={numbers}
                  onChange={(e) => setNumbers(e.target.value)}
                  rows={8}
                  className={`font-mono ${
                    numberListCount > 256 ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                  placeholder="201012345678&#10;201087654321"
                  disabled={loading}
                />
                <div className="flex justify-between items-center text-xs">
                  <span
                    className={
                      numberListCount > 256 ? 'text-red-600 font-semibold' : 'text-gray-500'
                    }
                  >
                    {numberListCount} contact(s) {numberListCount > 256 && '- EXCEEDS 256 LIMIT!'}
                  </span>
                  {numberListCount > 256 && (
                    <span className="text-red-600">Remove {numberListCount - 256} contact(s)</span>
                  )}
                </div>
              </div>

              {numberListCount > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Preview</AlertTitle>
                  <AlertDescription className="text-blue-700 text-xs">
                    <p>
                      Total numbers: <strong>{numberListCount}</strong>
                    </p>
                    <p>
                      Will create: <strong>{groupCount}</strong> broadcast group(s) (max 256 each)
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !selectedSession ||
                    !broadcastName ||
                    !numbers ||
                    numberListCount > 256
                  }
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Broadcast List'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Total Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No broadcast lists yet. Create one to get started!
                  </TableCell>
                </TableRow>
              ) : (
                broadcasts.map((broadcast) => (
                  <TableRow key={broadcast.id}>
                    <TableCell className="font-medium">{broadcast.name}</TableCell>
                    <TableCell>{broadcast.sessionId}</TableCell>
                    <TableCell>{broadcast.groups.length} groups</TableCell>
                    <TableCell>{broadcast.totalMembers}</TableCell>
                    <TableCell>{new Date(broadcast.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBroadcast(broadcast)
                          setShowSendModal(true)
                        }}
                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBroadcast(broadcast.id, broadcast.name)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Send Modal */}
      <Dialog
        open={showSendModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowSendModal(false)
            setSelectedBroadcast(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to "{selectedBroadcast?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-md text-sm space-y-1">
              <p className="text-gray-700">
                Groups: <strong>{selectedBroadcast?.groups.length}</strong>
              </p>
              <p className="text-gray-700">
                Total Recipients: <strong>{selectedBroadcast?.totalMembers}</strong>
              </p>
            </div>

            <form onSubmit={handleSendToBroadcast} className="space-y-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={6}
                  placeholder="Type your message here..."
                  disabled={sending}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSendModal(false)
                    setSelectedBroadcast(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={sending || !sendMessage}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send to All Groups
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
