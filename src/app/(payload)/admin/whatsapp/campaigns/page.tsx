'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  AlertCircle,
  Users,
  MessageSquare,
  Loader2,
} from 'lucide-react'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
  totalRecipients: number
  processedCount: number
  successCount: number
  failedCount: number
  createdAt: string
}

export default function CampaignManagerPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    template: '',
    contacts: '', // Text area for CSV/numbers
  })

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/campaigns`)
      const data = await response.json()
      setCampaigns(data)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      toast.error('Failed to fetch campaigns')
    }
  }

  useEffect(() => {
    fetchCampaigns()
    const interval = setInterval(fetchCampaigns, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Parse contacts
      const contactsList = newCampaign.contacts
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [phone] = line.split(',')
          return {
            phoneNumber: phone,
            variables: {}, // TODO: Parse variables
          }
        })

      const response = await fetch(`${WHATSAPP_SERVICE_URL}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaign.name,
          template: newCampaign.template,
          contacts: contactsList,
        }),
      })

      if (!response.ok) throw new Error('Failed to create campaign')

      setShowCreateModal(false)
      setNewCampaign({ name: '', template: '', contacts: '' })
      fetchCampaigns()
      toast.success('Campaign created successfully!')
    } catch (error) {
      console.error('Error creating campaign:', error)
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id: string, action: 'start' | 'pause' | 'resume') => {
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/campaigns/${id}/${action}`, {
        method: 'POST',
      })
      fetchCampaigns()
      toast.success(`Campaign ${action}ed successfully`)
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error)
      toast.error(`Failed to ${action} campaign`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/api/campaigns/${id}`, {
        method: 'DELETE',
      })
      fetchCampaigns()
      toast.success('Campaign deleted')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Failed to delete campaign')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your WhatsApp marketing campaigns
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Message Template</Label>
                <Textarea
                  value={newCampaign.template}
                  onChange={(e) => setNewCampaign({ ...newCampaign, template: e.target.value })}
                  rows={4}
                  placeholder="Hello {{name}}, check out our new offer!"
                  required
                />
                <p className="text-xs text-gray-500">Use {'{{variable}}'} for personalization.</p>
              </div>
              <div className="space-y-2">
                <Label>Contacts (CSV Format)</Label>
                <Textarea
                  value={newCampaign.contacts}
                  onChange={(e) => setNewCampaign({ ...newCampaign, contacts: e.target.value })}
                  rows={6}
                  className="font-mono"
                  placeholder="201012345678,John Doe&#10;201098765432,Jane Smith"
                  required
                />
                <p className="text-xs text-gray-500">
                  Format: PhoneNumber,Variable1,Variable2... (one per line)
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Campaign'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No campaigns found. Create your first campaign to get started.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <span className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-indigo-600" />
                        </span>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-indigo-600 truncate">
                            {campaign.name}
                          </h3>
                          <div className="ml-2 shrink-0 flex">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                campaign.status,
                              )}`}
                            >
                              {campaign.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <div className="flex space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Users className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              {campaign.totalRecipients} Recipients
                            </span>
                            <span className="flex items-center">
                              <CheckCircle className="shrink-0 mr-1.5 h-4 w-4 text-green-400" />
                              {campaign.successCount} Sent
                            </span>
                            <span className="flex items-center">
                              <AlertCircle className="shrink-0 mr-1.5 h-4 w-4 text-red-400" />
                              {campaign.failedCount} Failed
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div className="flex-1 mx-4 max-w-xs">
                            <Progress
                              value={(campaign.processedCount / campaign.totalRecipients) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex items-center space-x-2">
                      {campaign.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAction(campaign.id, 'start')}
                          className="text-green-600 hover:bg-green-50 hover:text-green-700"
                          title="Start Campaign"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      )}
                      {campaign.status === 'running' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAction(campaign.id, 'pause')}
                          className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                          title="Pause Campaign"
                        >
                          <Pause className="h-5 w-5" />
                        </Button>
                      )}
                      {campaign.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAction(campaign.id, 'resume')}
                          className="text-green-600 hover:bg-green-50 hover:text-green-700"
                          title="Resume Campaign"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(campaign.id)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50"
                        title="Delete Campaign"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
