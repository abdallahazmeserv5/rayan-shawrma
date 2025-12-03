import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Mail } from 'lucide-react'

export const EmailNode = memo(({ data, isConnectable }: any) => {
  return (
    <div className="p-3 border border-red-400 rounded-md bg-red-50 min-w-[180px] shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-red-400"
      />

      <div className="flex items-center mb-2 border-b border-red-200 pb-2 text-red-700">
        <Mail size={14} className="mr-2" />
        <strong className="text-sm">Send Email</strong>
      </div>

      <div className="text-xs text-gray-600">
        <div className="text-[10px] text-gray-500 mt-1 break-all">
          To: {data.to || 'recipient@example.com'}
        </div>
        <div className="text-[10px] text-gray-500 mt-1">
          Subject: {data.subject || 'Email subject'}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-red-400"
      />
    </div>
  )
})

EmailNode.displayName = 'EmailNode'
