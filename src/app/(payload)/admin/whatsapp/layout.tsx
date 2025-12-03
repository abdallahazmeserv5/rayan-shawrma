'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Send,
  Radio,
  Megaphone,
  MessageCircle,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import './../../../../app/(frontend)/globals.css'

const navigation = [
  { name: 'Dashboard', href: '/admin/whatsapp', icon: LayoutDashboard },
  { name: 'Senders', href: '/admin/whatsapp/senders', icon: Users },
  { name: 'Bulk Messages', href: '/admin/whatsapp/bulk', icon: MessageSquare },
  { name: 'Broadcasts', href: '/admin/whatsapp/broadcast', icon: Radio },
  { name: 'Campaigns', href: '/admin/whatsapp/campaigns', icon: Megaphone },
  { name: 'Auto Reply', href: '/admin/whatsapp/autoreply', icon: MessageCircle },
  { name: 'Flows', href: '/admin/whatsapp/flows', icon: Workflow },
  { name: 'Send Message', href: '/admin/whatsapp/send', icon: Send },
]

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">WhatsApp Admin</h1>
          <p className="text-xs text-gray-500 mt-1">Automation System</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <item.icon
                  className={cn('mr-3 h-5 w-5', isActive ? 'text-indigo-600' : 'text-gray-400')}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t">
          <Link
            href="/admin"
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Payload Admin
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
