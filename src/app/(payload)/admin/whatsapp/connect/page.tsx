'use client'

import { useEffect, useState, useRef } from 'react'
import { getSocket, type WhatsAppQREvent, type WhatsAppConnectedEvent } from '@/lib/socket-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, QrCode, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function WhatsAppConnectionPage() {
  const [status, setStatus] = useState<'disconnected' | 'scanning' | 'connected'>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusPollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Fetch initial status
    fetchStatus()

    // Setup Socket.io listeners
    const socket = getSocket()

    // Test socket connection
    socket.emit('test', { message: 'Client test' })
    socket.on('test-response', (data) => {
      console.log('✅ Socket test successful:', data)
    })

    socket.on('whatsapp:qr', (data: WhatsAppQREvent) => {
      setQrCode(data.qrCode)
      setStatus('scanning')
      setLoading(false)
      setError(null)
      // Clear any pending timeout
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
    })

    socket.on('whatsapp:connected', (data: WhatsAppConnectedEvent) => {
      setStatus('connected')
      setPhoneNumber(data.phoneNumber)
      setQrCode(null)
      setLoading(false)
      setError(null)
      // Clear any pending timeout
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
    })

    socket.on('whatsapp:disconnected', () => {
      setStatus('disconnected')
      setPhoneNumber(null)
      setQrCode(null)
      setLoading(false)
      // Clear any pending timeout
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
    })

    socket.on('whatsapp:error', (data: { error: string; details?: string }) => {
      console.error('❌ WhatsApp error from server:', data.error)
      if (data.details) {
        console.error('❌ Error details:', data.details)
      }
      setLoading(false)
      setStatus('disconnected')
      setError(data.details || data.error || 'Connection failed')
      // Clear any pending timeout
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
    })

    socket.on('whatsapp:init-started', (data: { success: boolean }) => {
      console.log('✅ Server confirmed initialization started:', data)
    })

    return () => {
      socket.off('whatsapp:qr')
      socket.off('whatsapp:connected')
      socket.off('whatsapp:disconnected')
      socket.off('whatsapp:error')
      // Clear any pending timeout on unmount
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
      // Clear any pending status poll interval on unmount
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current)
        statusPollIntervalRef.current = null
      }
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status')
      const data = await response.json()
      setStatus(data.status)
      setPhoneNumber(data.phoneNumber)
      setQrCode(data.qrCode)
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }

  const handleConnect = async (forceReset: boolean = false) => {
    // Ensure forceReset is always a boolean
    const shouldReset = typeof forceReset === 'boolean' ? forceReset : false

    // Clear any existing timeout and intervals
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current)
      connectTimeoutRef.current = null
    }
    if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current)
      statusPollIntervalRef.current = null
    }

    // Reset state
    if (shouldReset) {
      setStatus('disconnected')
      setQrCode(null)
      setPhoneNumber(null)
    }
    setError(null)
    setLoading(true)

    try {
      const resetFlag = Boolean(shouldReset)
      console.log('🔄 Initiating WhatsApp connection...', { forceReset: resetFlag })

      // Call the API endpoint which now triggers initialization
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceReset: resetFlag }),
      })
      const data = await response.json()

      if (!data.success) {
        console.error('Failed to connect:', data.error)
        setLoading(false)
        setStatus('disconnected')
        setError(data.error || 'Failed to initiate connection')
        return
      }

      console.log('✅ API call successful, emitting socket event...')

      // Emit socket event to trigger server-side initialization
      const socket = getSocket()
      console.log('📡 Emitting whatsapp:request-connect event...', { forceReset: resetFlag })
      socket.emit('whatsapp:request-connect', { forceReset: resetFlag })

      // Poll status API as a fallback if socket events don't fire
      let pollCount = 0
      const maxPolls = 20 // Poll for 10 seconds (20 * 500ms)
      statusPollIntervalRef.current = setInterval(async () => {
        pollCount++
        try {
          const statusResponse = await fetch('/api/whatsapp/status')
          const statusData = await statusResponse.json()

          // If we get a QR code, update UI
          if (statusData.qrCode) {
            console.log('📱 QR code found via status API')
            setQrCode(statusData.qrCode)
            setStatus('scanning')
            setLoading(false)
            setError(null)
            if (statusPollIntervalRef.current) {
              clearInterval(statusPollIntervalRef.current)
              statusPollIntervalRef.current = null
            }
            if (connectTimeoutRef.current) {
              clearTimeout(connectTimeoutRef.current)
              connectTimeoutRef.current = null
            }
            return
          }

          // If connected, update UI
          if (statusData.status === 'connected' && statusData.phoneNumber) {
            console.log('✅ Connected status found via status API')
            setStatus('connected')
            setPhoneNumber(statusData.phoneNumber)
            setQrCode(null)
            setLoading(false)
            setError(null)
            if (statusPollIntervalRef.current) {
              clearInterval(statusPollIntervalRef.current)
              statusPollIntervalRef.current = null
            }
            if (connectTimeoutRef.current) {
              clearTimeout(connectTimeoutRef.current)
              connectTimeoutRef.current = null
            }
            return
          }
        } catch (error) {
          console.error('Error polling status:', error)
        }

        if (pollCount >= maxPolls) {
          console.log('Status polling completed')
          if (statusPollIntervalRef.current) {
            clearInterval(statusPollIntervalRef.current)
            statusPollIntervalRef.current = null
          }
        }
      }, 500)

      // Set a 10-second timeout - if no QR code, show error
      connectTimeoutRef.current = setTimeout(() => {
        if (statusPollIntervalRef.current) {
          clearInterval(statusPollIntervalRef.current)
          statusPollIntervalRef.current = null
        }
        if (loading) {
          console.warn('Connection timeout - no QR code received')
          setLoading(false)
          setStatus('disconnected')
          setError('Connection timeout. Please try again.')
        }
        connectTimeoutRef.current = null
      }, 10000)
    } catch (error) {
      console.error('Error connecting:', error)
      setLoading(false)
      setStatus('disconnected')
      setError(error instanceof Error ? error.message : 'Failed to connect')
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current)
        connectTimeoutRef.current = null
      }
      if (statusPollIntervalRef.current) {
        clearInterval(statusPollIntervalRef.current)
        statusPollIntervalRef.current = null
      }
    }
  }

  const handleCancel = () => {
    console.log('User cancelled connection')
    setLoading(false)
    setError(null)
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current)
      connectTimeoutRef.current = null
    }
    if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current)
      statusPollIntervalRef.current = null
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setStatus('disconnected')
        setPhoneNumber(null)
        setQrCode(null)
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
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
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                {status === 'disconnected' && (
                  <>
                    <Button onClick={() => handleConnect(false)} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect WhatsApp'
                      )}
                    </Button>
                    {loading && (
                      <Button onClick={handleCancel} variant="outline">
                        Cancel
                      </Button>
                    )}
                  </>
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
              <img src={qrCode} alt="WhatsApp QR Code" className="max-w-sm rounded-lg border" />
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
