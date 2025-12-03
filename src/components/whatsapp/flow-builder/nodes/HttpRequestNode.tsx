import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Globe } from 'lucide-react'

export const HttpRequestNode = memo(({ data, isConnectable }: any) => {
  return (
    <div className="p-3 border border-teal-500 rounded-md bg-teal-50 min-w-[180px] shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-teal-500"
      />

      <div className="flex items-center mb-2 border-b border-teal-200 pb-2 text-teal-700">
        <Globe size={14} className="mr-2" />
        <strong className="text-sm">HTTP Request</strong>
      </div>

      <div className="text-xs text-gray-600">
        <div className="font-semibold">{data.method || 'GET'}</div>
        <div className="text-[10px] text-gray-500 mt-1 break-all">
          {data.url || 'https://api.example.com'}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-teal-500"
      />
    </div>
  )
})

HttpRequestNode.displayName = 'HttpRequestNode'
