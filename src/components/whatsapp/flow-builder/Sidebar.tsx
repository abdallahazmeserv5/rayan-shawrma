import React from 'react'
import {
  MessageSquare,
  Play,
  GitFork,
  Clock,
  Globe,
  Mail,
  CircleHelp,
  LayoutGrid,
  List,
  ListFilter,
} from 'lucide-react'

export default function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="w-64 p-4 border-r border-gray-200 bg-gray-50 h-full">
      <div className="text-sm text-gray-500 mb-4">
        You can drag these nodes to the pane on the right.
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'message')}
        draggable
      >
        <MessageSquare size={16} className="mr-2 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Message Node</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'start')}
        draggable
      >
        <Play size={16} className="mr-2 text-green-600" />
        <span className="text-sm font-medium text-gray-700">Start Node</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'question')}
        draggable
      >
        <CircleHelp size={16} className="mr-2 text-purple-600" />
        <span className="text-sm font-medium text-gray-700">Ask Question</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'condition')}
        draggable
      >
        <GitFork size={16} className="mr-2 text-orange-600" />
        <span className="text-sm font-medium text-gray-700">Condition Node</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'delay')}
        draggable
      >
        <Clock size={16} className="mr-2 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Delay Node</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'http')}
        draggable
      >
        <Globe size={16} className="mr-2 text-teal-600" />
        <span className="text-sm font-medium text-gray-700">HTTP Request</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'email')}
        draggable
      >
        <Mail size={16} className="mr-2 text-red-600" />
        <span className="text-sm font-medium text-gray-700">Send Email</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'buttons')}
        draggable
      >
        <LayoutGrid size={16} className="mr-2 text-purple-600" />
        <span className="text-sm font-medium text-gray-700">Send Buttons</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'list')}
        draggable
      >
        <List size={16} className="mr-2 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Send List</span>
      </div>

      <div
        className="flex items-center p-3 border border-gray-300 rounded-md mb-3 cursor-grab bg-white hover:bg-gray-50 shadow-sm transition-colors"
        onDragStart={(event) => onDragStart(event, 'menuResponse')}
        draggable
      >
        <ListFilter size={16} className="mr-2 text-teal-600" />
        <span className="text-sm font-medium text-gray-700">Menu Response</span>
      </div>
    </aside>
  )
}
