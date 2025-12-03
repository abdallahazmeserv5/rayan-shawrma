import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { MessageSquare } from 'lucide-react'

export const MessageNode = memo(({ data, isConnectable }: any) => {
  return (
    <div className="p-3 border border-gray-400 rounded-md bg-white min-w-[150px] shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />

      <div className="flex items-center mb-2 border-b border-gray-100 pb-2 text-gray-700">
        <MessageSquare size={14} className="mr-2" />
        <strong className="text-sm">Send Message</strong>
      </div>

      <div className="text-xs text-gray-500">{data.text || 'Enter message...'}</div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  )
})

MessageNode.displayName = 'MessageNode'
