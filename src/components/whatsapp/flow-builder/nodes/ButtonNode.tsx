import { memo, useState, useEffect } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { LayoutGrid, Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export const ButtonNode = memo(({ id, data, isConnectable }: any) => {
  const { setNodes } = useReactFlow()
  const [buttons, setButtons] = useState(data.buttons || [{ id: 'btn1', text: '' }])

  // Update local state when data changes externally
  useEffect(() => {
    if (data.buttons) {
      setButtons(data.buttons)
    }
  }, [data.buttons])

  const updateData = (updates: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...updates, messageType: 'buttons' },
          }
        }
        return node
      }),
    )
  }

  const addButton = () => {
    if (buttons.length >= 3) return // Max 3 buttons as per WhatsApp limitations
    const newButtons = [...buttons, { id: `btn${buttons.length + 1}`, text: '' }]
    setButtons(newButtons)
    updateData({ buttons: newButtons })
  }

  const removeButton = (index: number) => {
    if (buttons.length <= 1) return // Minimum 1 button
    const newButtons = buttons.filter((_: any, i: number) => i !== index)
    setButtons(newButtons)
    updateData({ buttons: newButtons })
  }

  const updateButton = (index: number, field: string, value: string) => {
    const newButtons = buttons.map((btn: any, i: number) =>
      i === index ? { ...btn, [field]: value } : btn,
    )
    setButtons(newButtons)
    updateData({ buttons: newButtons })
  }

  return (
    <div className="w-[350px] bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
      <div className="bg-purple-50 p-3 border-b border-purple-200 flex items-center justify-between handle drag-handle cursor-move">
        <div className="flex items-center gap-2 text-purple-700">
          <LayoutGrid size={16} />
          <span className="font-medium text-sm">Send Buttons</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Main Text */}
        <div>
          <Label className="text-xs mb-1.5 block text-gray-500">Message Text</Label>
          <Textarea
            placeholder="Please choose an option:"
            className="min-h-[80px] text-sm resize-none"
            value={data.text || ''}
            onChange={(e) => updateData({ text: e.target.value })}
          />
          <p className="text-[10px] text-gray-400 mt-1">Supports variables like {'{{name}}'}</p>
        </div>

        {/* Buttons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-gray-500">Buttons ({buttons.length}/3)</Label>
            {buttons.length < 3 && (
              <Button size="sm" variant="outline" onClick={addButton} className="h-6 px-2 text-xs">
                <Plus size={12} className="mr-1" />
                Add
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {buttons.map((button: any, index: number) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    placeholder={`Button ${index + 1} text (max ~20 chars)`}
                    value={button.text}
                    onChange={(e) => updateButton(index, 'text', e.target.value)}
                    className="text-sm"
                    maxLength={25}
                  />
                </div>
                {buttons.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeButton(index)}
                    className="h-9 w-9 p-0 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer (Optional) */}
        <div>
          <Label className="text-xs mb-1.5 block text-gray-500">Footer (Optional)</Label>
          <Input
            placeholder="Reply with your choice"
            value={data.footer || ''}
            onChange={(e) => updateData({ footer: e.target.value })}
            className="text-sm"
          />
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  )
})

ButtonNode.displayName = 'ButtonNode'
