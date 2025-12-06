import { memo, useState, useEffect } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { ListFilter, Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MenuOption {
  id: string
  value: string
  label: string
}

export const MenuResponseNode = memo(({ id, data, isConnectable }: any) => {
  const { setNodes } = useReactFlow()
  const [options, setOptions] = useState<MenuOption[]>(
    data.options || [
      { id: 'opt1', value: '1', label: 'Option 1' },
      { id: 'opt2', value: '2', label: 'Option 2' },
    ],
  )
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'number'>(
    data.matchType || 'exact',
  )

  // Sync with external data changes
  useEffect(() => {
    if (data.options) {
      setOptions(data.options)
    }
    if (data.matchType) {
      setMatchType(data.matchType)
    }
  }, [data.options, data.matchType])

  const updateData = (updates: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...updates },
          }
        }
        return node
      }),
    )
  }

  const addOption = () => {
    const newId = `opt${Date.now()}`
    const newOptions = [
      ...options,
      { id: newId, value: `${options.length + 1}`, label: `Option ${options.length + 1}` },
    ]
    setOptions(newOptions)
    updateData({ options: newOptions })
  }

  const removeOption = (index: number) => {
    if (options.length <= 1) return // Minimum 1 option
    const newOptions = options.filter((_, i) => i !== index)
    setOptions(newOptions)
    updateData({ options: newOptions })
  }

  const updateOption = (index: number, field: keyof MenuOption, value: string) => {
    const newOptions = options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    setOptions(newOptions)
    updateData({ options: newOptions })
  }

  const handleMatchTypeChange = (value: 'exact' | 'contains' | 'number') => {
    setMatchType(value)
    updateData({ matchType: value })
  }

  return (
    <div className="w-[320px] bg-white rounded-lg border border-teal-400 shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-teal-50 p-3 border-b border-teal-200 flex items-center justify-between handle drag-handle cursor-move">
        <div className="flex items-center gap-2 text-teal-700">
          <ListFilter size={16} />
          <span className="font-medium text-sm">Menu Response</span>
        </div>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-teal-500"
        style={{ top: 24 }}
      />

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Match Type */}
        <div>
          <Label className="text-xs mb-1.5 block text-gray-500">Match Type</Label>
          <Select value={matchType} onValueChange={handleMatchTypeChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exact">Exact Match</SelectItem>
              <SelectItem value="contains">Contains</SelectItem>
              <SelectItem value="number">Number/Position</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-gray-400 mt-1">
            {matchType === 'exact' && 'User must type the exact value'}
            {matchType === 'contains' && 'User message must contain the value'}
            {matchType === 'number' && 'Match by number (1, 2, 3...)'}
          </p>
        </div>

        {/* Options */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-gray-500">Response Options</Label>
            <Button size="sm" variant="outline" onClick={addOption} className="h-6 px-2 text-xs">
              <Plus size={12} className="mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {options.map((option, index) => (
              <div
                key={option.id}
                className="flex gap-2 items-center p-2 bg-gray-50 rounded border"
              >
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="Match value (e.g. 1)"
                    value={option.value}
                    onChange={(e) => updateOption(index, 'value', e.target.value)}
                    className="text-xs h-7"
                  />
                  <Input
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                    className="text-xs h-7"
                  />
                </div>
                {options.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOption(index)}
                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}

                {/* Output Handle for this option */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={option.id}
                  isConnectable={isConnectable}
                  className="w-2.5 h-2.5 bg-teal-500"
                  style={{ top: 100 + index * 68 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Default/Fallback Section */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Default (no match)</span>
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          </div>
        </div>
      </div>

      {/* Default Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        isConnectable={isConnectable}
        className="w-2.5 h-2.5 bg-gray-400"
        style={{ bottom: 16, top: 'auto' }}
      />
    </div>
  )
})

MenuResponseNode.displayName = 'MenuResponseNode'
