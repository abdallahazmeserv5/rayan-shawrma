'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function MenuHeader() {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="container mx-auto px-4 py-4">
        {/* Logo and Title */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-center flex-1">قائمة الطلب</h1>
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <span className="text-white text-2xl">🔥</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="search"
            placeholder="بحث..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-gray-200 rounded-lg"
          />
        </div>
      </div>
    </div>
  )
}
