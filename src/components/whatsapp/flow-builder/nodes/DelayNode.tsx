import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Clock } from 'lucide-react'

export const DelayNode = memo(({ data, isConnectable }: any) => {
  return (
    <div className="p-3 border border-blue-400 rounded-md bg-blue-50 min-w-[150px] shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-400"
      />

      <div className="flex items-center mb-2 border-b border-blue-200 pb-2 text-blue-600">
        <Clock size={14} className="mr-2" />
        <strong className="text-sm">Delay</strong>
      </div>

      <div className="text-xs text-gray-600">
        Wait: <strong>{data.delay || '5'} seconds</strong>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-400"
      />
    </div>
  )
})

DelayNode.displayName = 'DelayNode'
