'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, Loader2, Save } from 'lucide-react'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

interface Session {
  sessionId: string
  status: string
}

export default function AutoReplyPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    isActive: false,
    senderNumber: '',
    messageContent: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [configRes, sessionsRes] = await Promise.all([
        fetch(`${WHATSAPP_SERVICE_URL}/api/auto-reply`),
        fetch(`${WHATSAPP_SERVICE_URL}/sessions`),
      ])

      const configData = await configRes.json()
      const sessionsData = await sessionsRes.json()

      setSessions(sessionsData.sessions || [])

      setFormData({
        isActive: configData.isActive,
        senderNumber: configData.senderNumber || '',
        messageContent:
          configData.messageContent || 'Thank you for your message. We will get back to you soon!',
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/auto-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      toast.success('Auto-reply configuration saved successfully!')
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Auto Reply Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure automatic replies to incoming WhatsApp messages
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-base font-medium text-gray-900">Enable Auto Reply</Label>
                <p className="text-sm text-gray-500">Automatically respond to incoming messages</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Session Selection */}
            <div className="space-y-2">
              <Label>Reply From (Select WhatsApp Session)</Label>
              {sessions.length === 0 ? (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTitle className="text-yellow-800">No sessions available</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    Please connect a WhatsApp session first on the Dashboard page (scan QR code).
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  value={formData.senderNumber}
                  onValueChange={(value) => setFormData({ ...formData, senderNumber: value })}
                  required={formData.isActive}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.sessionId} value={session.sessionId}>
                        {session.sessionId} ({session.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <Label>Auto Reply Message</Label>
              <Textarea
                value={formData.messageContent}
                onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
                rows={6}
                placeholder="Enter your auto-reply message here..."
                required={formData.isActive}
              />
              <p className="text-xs text-gray-500">
                This message will be sent automatically after 1 second when someone sends you a
                message.
              </p>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              disabled={
                saving ||
                (formData.isActive && (!formData.senderNumber || !formData.messageContent))
              }
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">How it works</AlertTitle>
        <AlertDescription className="text-blue-700">
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>When enabled, the system will automatically reply to all incoming messages</li>
            <li>The reply will be sent after a 1-second delay</li>
            <li>
              All replies will come from the selected session, regardless of which session received
              the message
            </li>
            <li>Make sure the selected session is connected before enabling auto-reply</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
