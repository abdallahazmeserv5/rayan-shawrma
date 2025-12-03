'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, MessageSquare, Users, Smartphone, Zap, BarChart3, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const WHATSAPP_SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001'

interface Session {
  sessionId: string
  status: string
}

interface DashboardStats {
  totalSessions: number
  connectedSessions: number
  totalMessagesSent: number // Placeholder for now
  activeCampaigns: number // Placeholder for now
}

export default function WhatsAppDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    connectedSessions: 0,
    totalMessagesSent: 0,
    activeCampaigns: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const sessionsRes = await fetch(`${WHATSAPP_SERVICE_URL}/sessions`)
      const sessionsData = await sessionsRes.json()
      const sessionList = sessionsData.sessions || []

      setSessions(sessionList)
      setStats({
        totalSessions: sessionList.length,
        connectedSessions: sessionList.filter((s: Session) => s.status === 'connected').length,
        totalMessagesSent: 0, // TODO: Fetch from API if available
        activeCampaigns: 0, // TODO: Fetch from API if available
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Send Message',
      icon: MessageSquare,
      href: '/admin/whatsapp/send',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Bulk Message',
      icon: Users,
      href: '/admin/whatsapp/bulk',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      title: 'Manage Senders',
      icon: Smartphone,
      href: '/admin/whatsapp/senders',
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Automation Flows',
      icon: Zap,
      href: '/admin/whatsapp/flows',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of your WhatsApp integration</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Connected Sessions</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.connectedSessions} / {stats.totalSessions}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        {/* Placeholders for other stats */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">System Status</p>
              <h3 className="text-2xl font-bold text-green-600">Operational</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className={`p-4 rounded-full ${action.bg}`}>
                    <action.icon className={`h-8 w-8 ${action.color}`} />
                  </div>
                  <h3 className="font-medium text-gray-900">{action.title}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No sessions found. Go to Manage Senders to add one.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={`p-4 rounded-lg border flex items-center justify-between ${
                    session.status === 'connected'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        session.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{session.sessionId}</p>
                      <p className="text-xs text-gray-500 capitalize">{session.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
