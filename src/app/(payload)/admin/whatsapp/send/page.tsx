'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Send, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SendMessagePage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Call Express WhatsApp service directly
      const whatsappServiceUrl =
        process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'
      const response = await fetch(`${whatsappServiceUrl}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'global_session', // Using default session
          to: phoneNumber,
          text: message,
        }),
      })

      const data = await response.json()

      if (response.ok && data.message) {
        toast({
          title: 'Message sent successfully!',
          description: `Your message was sent to ${phoneNumber}`,
        })
        // Clear form
        setMessage('')
      } else {
        toast({
          title: 'Failed to send message',
          description: data.error || 'An error occurred',
          variant: 'destructive',
        })
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/admin/whatsapp/connect">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Connection
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Send WhatsApp Message</h1>
        <p className="text-muted-foreground">Send a message to any phone number via WhatsApp</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message Details</CardTitle>
          <CardDescription>
            Enter the recipient&apos;s phone number with country code (e.g., +1234567890) and your
            message
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Include country code (e.g., +1 for USA, +44 for UK)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={loading}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">{message.length} characters</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Always include the country code with a + sign (e.g., +1234567890)</p>
          <p>• Make sure the number is registered on WhatsApp</p>
          <p>• Messages are logged in the database for tracking</p>
          <p>• Check the WhatsApp Messages collection in Payload admin for history</p>
        </CardContent>
      </Card>
    </div>
  )
}
