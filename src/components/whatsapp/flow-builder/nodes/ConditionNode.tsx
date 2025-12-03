import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { GitFork } from 'lucide-react'

export const ConditionNode = memo(({ data, isConnectable }: any) => {
  return (
    <div className="p-3 border border-orange-400 rounded-md bg-orange-50 min-w-[180px] shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-orange-400"
      />

      <div className="flex items-center mb-2 border-b border-orange-200 pb-2 text-orange-600">
        <GitFork size={14} className="mr-2" />
        <strong className="text-sm">Condition</strong>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        If message contains: <br />
        <strong className="text-gray-800">{data.condition || 'keyword'}</strong>
      </div>

      <div className="flex justify-between mt-2">
        <div className="relative">
          <span className="text-[10px] text-green-600 absolute -top-4 left-0">True</span>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            isConnectable={isConnectable}
            className="w-3 h-3 bg-green-500 top-2"
          />
        </div>
        <div className="relative">
          <span className="text-[10px] text-red-600 absolute -top-4 right-0">False</span>
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            isConnectable={isConnectable}
            className="w-3 h-3 bg-red-500 top-2 mt-4"
          />
        </div>
      </div>
    </div>
  )
})

ConditionNode.displayName = 'ConditionNode'
