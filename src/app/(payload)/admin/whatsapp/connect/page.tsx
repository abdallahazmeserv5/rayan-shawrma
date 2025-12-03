'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, QrCode, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

// Helper function to create a timeout signal
const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

export default function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<'disconnected' | 'scanning' | 'connected'>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch initial status on mount
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/global_session/status`, {
        signal: createTimeoutSignal(5000), // 5 second timeout
      })

      if (!response.ok) {
        setStatus('disconnected')
        return
      }

      const data = await response.json()

      if (data.status === 'connected') {
        setStatus('connected')
        // Try to get phone number from sessions list
        try {
          const sessionsResponse = await fetch(`${WHATSAPP_SERVICE_URL}/sessions`)
          const sessionsData = await sessionsResponse.json()
          const session = sessionsData.sessions?.find((s: any) => s.sessionId === 'global_session')
          if (session?.phoneNumber) {
            setPhoneNumber(session.phoneNumber)
          }
        } catch (err) {
          console.error('Error fetching sessions:', err)
        }
      } else {
        setStatus('disconnected')
      }
    } catch (error) {
      console.error('Error fetching status:', error)
      setStatus('disconnected')
      // Only show error if it's not a network error (to avoid showing error on initial load)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError(
          `Cannot connect to WhatsApp service. Please make sure it's running at ${WHATSAPP_SERVICE_URL}`,
        )
      }
    }
  }

  const handleConnect = async () => {
    setError(null)
    setLoading(true)
    setQrCode(null)

    try {
      // First, check if the service is reachable
      try {
        const healthCheck = await fetch(`${WHATSAPP_SERVICE_URL}/sessions`, {
          method: 'GET',
          signal: createTimeoutSignal(5000), // 5 second timeout
        })
        if (!healthCheck.ok) {
          throw new Error('Service returned an error')
        }
      } catch (healthError) {
        setLoading(false)
        setError(
          `Cannot connect to WhatsApp service at ${WHATSAPP_SERVICE_URL}. Please make sure the WhatsApp service is running. You can start it by running: npm run dev:whatsapp`,
        )
        return
      }

      // Start the session
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: 'global_session' }),
      })
      console.log({ response })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()
      console.log({ data })

      // Poll for QR code
      let attempts = 0
      const maxAttempts = 20 // 10 seconds

      const pollQRCode = async () => {
        try {
          const qrResponse = await fetch(`${WHATSAPP_SERVICE_URL}/session/global_session/qr`)
          console.log({ qrResponse })
          if (qrResponse.ok) {
            const qrData = await qrResponse.json()
            console.log({ qrData })
            if (qrData.qr) {
              setQrCode(qrData.qr)
              setStatus('scanning')
              setLoading(false)
              // Start polling for connection
              pollConnection()
              return
            }
          }

          attempts++
          if (attempts < maxAttempts) {
            setTimeout(pollQRCode, 500)
          } else {
            setLoading(false)
            setError('QR code generation timeout. Please try again.')
          }
        } catch (error) {
          console.error('Error polling QR code:', error)
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(pollQRCode, 500)
          } else {
            setLoading(false)
            setError('Failed to get QR code. Please try again.')
          }
        }
      }

      pollQRCode()
    } catch (error) {
      console.error('Error connecting:', error)
      setLoading(false)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError(
          `Cannot connect to WhatsApp service at ${WHATSAPP_SERVICE_URL}. Please make sure the WhatsApp service is running. You can start it by running: npm run dev:whatsapp`,
        )
      } else {
        setError(error instanceof Error ? error.message : 'Failed to connect')
      }
    }
  }

  const pollConnection = () => {
    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`${WHATSAPP_SERVICE_URL}/session/global_session/status`)
        const statusData = await statusResponse.json()
        console.log({ statusData, statusResponse })
        if (statusData.status === 'connected') {
          setStatus('connected')
          setQrCode(null)
          setLoading(false)
          clearInterval(interval)

          // Get phone number
          const sessionsResponse = await fetch(`${WHATSAPP_SERVICE_URL}/sessions`)
          const sessionsData = await sessionsResponse.json()
          const session = sessionsData.sessions?.find((s: any) => s.sessionId === 'global_session')
          if (session?.phoneNumber) {
            setPhoneNumber(session.phoneNumber)
          }
        }
      } catch (error) {
        console.error('Error polling connection:', error)
      }
    }, 1000)

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000)
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/global_session`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setStatus('disconnected')
        setPhoneNumber(null)
        setQrCode(null)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      setError('Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">WhatsApp Connection</h1>
        <p className="text-muted-foreground">
          Manage your WhatsApp integration and connection status
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Connection Status</span>
              {status === 'connected' && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              )}
              {status === 'scanning' && (
                <Badge variant="secondary">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Scanning
                </Badge>
              )}
              {status === 'disconnected' && (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  Disconnected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {status === 'connected' && phoneNumber && `Connected as ${phoneNumber}`}
              {status === 'scanning' && 'Scan the QR code with your WhatsApp mobile app'}
              {status === 'disconnected' && 'Click connect to start the WhatsApp integration'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3">
                {status === 'disconnected' && (
                  <Button onClick={handleConnect} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect WhatsApp'
                    )}
                  </Button>
                )}
                {status === 'connected' && (
                  <>
                    <Button onClick={handleDisconnect} variant="destructive" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                    <Button asChild>
                      <Link href="/admin/whatsapp/send">Send Message</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        {status === 'scanning' && qrCode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, and
                scan this QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <QRCodeSVG
                value={qrCode}
                size={256}
                level="M"
                className="rounded-lg border p-4 bg-white"
              />
            </CardContent>
          </Card>
        )}

        {/* Connected Info Card */}
        {status === 'connected' && (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Send Messages</CardTitle>
              <CardDescription>
                Your WhatsApp is connected and ready to send messages. The session will persist
                across server restarts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/admin/whatsapp/send">Go to Send Message →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
