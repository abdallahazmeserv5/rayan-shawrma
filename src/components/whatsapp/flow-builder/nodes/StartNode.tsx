import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Play } from 'lucide-react'

export const StartNode = memo(({ isConnectable }: any) => {
  return (
    <div className="p-3 border border-green-500 rounded-md bg-green-50 min-w-[100px] text-center shadow-sm">
      <div className="flex items-center justify-center text-green-600">
        <Play size={14} className="mr-2" />
        <strong className="text-sm">Start</strong>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500"
      />
    </div>
  )
})

StartNode.displayName = 'StartNode'
