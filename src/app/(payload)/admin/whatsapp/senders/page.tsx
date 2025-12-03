'use client'

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  RefreshCw,
  Smartphone,
  Activity,
  BarChart2,
  Wifi,
  WifiOff,
  QrCode,
  Loader2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Sender {
  id: string
  name: string
  phoneNumber: string
  status: 'connected' | 'disconnected' | 'banned' | 'paused'
  healthScore: number
  sentThisDay: number
  quotaPerDay: number
  lastConnected: string
}

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

export default function SenderManagerPage() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSender, setNewSender] = useState({
    name: '',
    phoneNumber: '',
    quotaPerDay: 5000,
  })

  // QR Code State
  const [connectingSenderId, setConnectingSenderId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)

  const fetchSenders = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/senders`)
      if (!response.ok) {
        throw new Error('Failed to fetch senders')
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setSenders(data)
      } else {
        console.error('Unexpected data format:', data)
        setSenders([])
      }
    } catch (error) {
      console.error('Error fetching senders:', error)
      toast.error('Failed to fetch senders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSenders()
    const interval = setInterval(fetchSenders, 10000) // Auto-refresh every 10s
    return () => clearInterval(interval)
  }, [])

  // Poll for QR Code and Status when connecting
  useEffect(() => {
    if (!connectingSenderId) return

    const pollInterval = setInterval(async () => {
      try {
        // Check status
        const statusRes = await fetch(`${WHATSAPP_SERVICE_URL}/api/senders/${connectingSenderId}`)
        if (!statusRes.ok) return
        const sender = await statusRes.json()

        if (sender.status === 'connected') {
          setConnectingSenderId(null)
          setQrCode(null)
          fetchSenders()
          toast.success('Sender connected successfully!')
          return
        }

        // Fetch QR Code
        const qrRes = await fetch(`${WHATSAPP_SERVICE_URL}/api/senders/${connectingSenderId}/qr`)
        if (qrRes.ok) {
          const data = await qrRes.json()
          setQrCode(data.qr)
        }
      } catch (error) {
        console.error('Error polling status/QR:', error)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [connectingSenderId])

  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/senders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSender),
      })

      if (response.ok) {
        setShowAddModal(false)
        setNewSender({ name: '', phoneNumber: '', quotaPerDay: 5000 })
        fetchSenders()
        const createdSender = await response.json()
        toast.success('Sender added successfully')
        // Auto-start connection
        handleConnect(createdSender.id)
      } else {
        toast.error('Failed to add sender')
      }
    } catch (error) {
      console.error('Error adding sender:', error)
      toast.error('Error adding sender')
    }
  }

  const handleDeleteSender = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sender?')) return
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/senders/${id}`, {
        method: 'DELETE',
      })
      fetchSenders()
      toast.success('Sender deleted')
    } catch (error) {
      console.error('Error deleting sender:', error)
      toast.error('Failed to delete sender')
    }
  }

  const handleConnect = async (id: string) => {
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/senders/${id}/connect`, {
        method: 'POST',
      })
      setConnectingSenderId(id)
      setQrCode(null) // Reset QR while waiting for new one
      toast.info('Starting connection process...')
    } catch (error) {
      console.error('Error starting connection:', error)
      toast.error('Failed to start connection process')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800'
      case 'disconnected':
        return 'bg-gray-100 text-gray-800'
      case 'banned':
        return 'bg-red-100 text-red-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sender Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your WhatsApp numbers and monitor their health
          </p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Sender
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Sender</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSender} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newSender.name}
                  onChange={(e) => setNewSender({ ...newSender, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={newSender.phoneNumber}
                  onChange={(e) => setNewSender({ ...newSender, phoneNumber: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quota">Daily Quota</Label>
                <Input
                  id="quota"
                  type="number"
                  min="1"
                  max="10000"
                  value={newSender.quotaPerDay}
                  onChange={(e) =>
                    setNewSender({ ...newSender, quotaPerDay: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                Add Sender
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="p-3 rounded-full bg-gray-100 text-gray-500 mr-4">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Senders</p>
              <p className="text-2xl font-semibold text-gray-900">{senders?.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-500 mr-4">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {senders?.filter((s) => s.status === 'connected').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-500 mr-4">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Daily Capacity</p>
              <p className="text-2xl font-semibold text-gray-900">
                {senders?.reduce((acc, s) => acc + s.quotaPerDay, 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Senders List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {senders?.map((sender) => (
            <li key={sender.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <span className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                        {sender.status === 'connected' ? (
                          <Wifi className="h-6 w-6 text-green-500" />
                        ) : (
                          <WifiOff className="h-6 w-6 text-gray-400" />
                        )}
                      </span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-indigo-600 truncate">
                          {sender.name}
                        </h3>
                        <div className="ml-2 flex-shrink-0 flex">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              sender.status,
                            )}`}
                          >
                            {sender.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex space-x-4 text-sm text-gray-500">
                          <span>{sender.phoneNumber}</span>
                          <span>Health: {sender.healthScore}%</span>
                          <span>
                            Usage: {sender.sentThisDay} / {sender.quotaPerDay}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Last connected:{' '}
                          {sender.lastConnected
                            ? new Date(sender.lastConnected).toLocaleDateString()
                            : 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    {sender.status === 'disconnected' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleConnect(sender.id)}
                        className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                        title="Connect (Scan QR)"
                      >
                        <QrCode className="h-5 w-5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fetchSenders()}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSender(sender.id)}
                      className="text-red-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {senders?.length === 0 && (
            <li className="px-4 py-12 text-center text-gray-500">
              No senders found. Add a sender to get started.
            </li>
          )}
        </ul>
      </div>

      {/* QR Code Modal */}
      <Dialog
        open={!!connectingSenderId}
        onOpenChange={(open) => !open && setConnectingSenderId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="mb-4 p-3 bg-indigo-100 rounded-full">
              <QrCode className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex justify-center mb-4">
              {qrCode ? (
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <QRCodeSVG value={qrCode} size={256} />
                </div>
              ) : (
                <div className="h-64 w-64 flex items-center justify-center bg-gray-100 rounded-lg">
                  <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 text-center">
              Open WhatsApp on your phone {'>'} Linked Devices {'>'} Link a Device
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
