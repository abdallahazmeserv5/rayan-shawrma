import { memo, useState, useEffect } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { List, Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export const ListNode = memo(({ id, data, isConnectable }: any) => {
  const { setNodes } = useReactFlow()
  const [sections, setSections] = useState(
    data.sections || [{ title: '', rows: [{ id: 'row1', title: '', description: '' }] }],
  )

  // Update local state when data changes externally
  useEffect(() => {
    if (data.sections) {
      setSections(data.sections)
    }
  }, [data.sections])

  const updateData = (updates: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, ...updates, messageType: 'list' },
          }
        }
        return node
      }),
    )
  }

  const addSection = () => {
    const newSections = [
      ...sections,
      { title: '', rows: [{ id: `row${Date.now()}`, title: '', description: '' }] },
    ]
    setSections(newSections)
    updateData({ sections: newSections })
  }

  const removeSection = (sectionIndex: number) => {
    if (sections.length <= 1) return // Minimum 1 section
    const newSections = sections.filter((_: any, i: number) => i !== sectionIndex)
    setSections(newSections)
    updateData({ sections: newSections })
  }

  const updateSection = (sectionIndex: number, field: string, value: string) => {
    const newSections = sections.map((section: any, i: number) =>
      i === sectionIndex ? { ...section, [field]: value } : section,
    )
    setSections(newSections)
    updateData({ sections: newSections })
  }

  const addRow = (sectionIndex: number) => {
    const newSections = sections.map((section: any, i: number) =>
      i === sectionIndex
        ? {
            ...section,
            rows: [...section.rows, { id: `row${Date.now()}`, title: '', description: '' }],
          }
        : section,
    )
    setSections(newSections)
    updateData({ sections: newSections })
  }

  const removeRow = (sectionIndex: number, rowIndex: number) => {
    const section = sections[sectionIndex]
    if (section.rows.length <= 1) return // Minimum 1 row per section
    const newSections = sections.map((section: any, i: number) =>
      i === sectionIndex
        ? { ...section, rows: section.rows.filter((_: any, j: number) => j !== rowIndex) }
        : section,
    )
    setSections(newSections)
    updateData({ sections: newSections })
  }

  const updateRow = (sectionIndex: number, rowIndex: number, field: string, value: string) => {
    const newSections = sections.map((section: any, i: number) =>
      i === sectionIndex
        ? {
            ...section,
            rows: section.rows.map((row: any, j: number) =>
              j === rowIndex ? { ...row, [field]: value } : row,
            ),
          }
        : section,
    )
    setSections(newSections)
    updateData({ sections: newSections })
  }

  return (
    <div className="w-[380px] bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
      <div className="bg-blue-50 p-3 border-b border-blue-200 flex items-center justify-between handle drag-handle cursor-move">
        <div className="flex items-center gap-2 text-blue-700">
          <List size={16} />
          <span className="font-medium text-sm">Send List</span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {/* Main Text */}
        <div>
          <Label className="text-xs mb-1.5 block text-gray-500">Message Text</Label>
          <Textarea
            placeholder="Choose from our menu:"
            className="min-h-[60px] text-sm resize-none"
            value={data.text || ''}
            onChange={(e) => updateData({ text: e.target.value })}
          />
        </div>

        {/* Button Text */}
        <div>
          <Label className="text-xs mb-1.5 block text-gray-500">Button Text</Label>
          <Input
            placeholder="View Options"
            value={data.buttonText || ''}
            onChange={(e) => updateData({ buttonText: e.target.value })}
            className="text-sm"
          />
        </div>

        {/* Sections */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-gray-500">Sections ({sections.length})</Label>
            <Button size="sm" variant="outline" onClick={addSection} className="h-6 px-2 text-xs">
              <Plus size={12} className="mr-1" />
              Section
            </Button>
          </div>

          <div className="space-y-3">
            {sections.map((section: any, sectionIndex: number) => (
              <div
                key={sectionIndex}
                className="border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2"
              >
                {/* Section Header */}
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder={`Section ${sectionIndex + 1} Title`}
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                      className="text-sm font-medium"
                    />
                  </div>
                  {sections.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSection(sectionIndex)}
                      className="h-9 w-9 p-0 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>

                {/* Rows */}
                <div className="space-y-2 pl-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Rows ({section.rows.length})</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addRow(sectionIndex)}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      <Plus size={10} className="mr-0.5" />
                      Row
                    </Button>
                  </div>

                  {section.rows.map((row: any, rowIndex: number) => (
                    <div key={rowIndex} className="bg-white border border-gray-200 rounded p-2">
                      <div className="flex gap-2 items-start mb-1.5">
                        <Input
                          placeholder="Row title"
                          value={row.title}
                          onChange={(e) =>
                            updateRow(sectionIndex, rowIndex, 'title', e.target.value)
                          }
                          className="text-xs h-7"
                        />
                        {section.rows.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRow(sectionIndex, rowIndex)}
                            className="h-7 w-7 p-0 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Description (optional)"
                        value={row.description || ''}
                        onChange={(e) =>
                          updateRow(sectionIndex, rowIndex, 'description', e.target.value)
                        }
                        className="text-xs h-7"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer (Optional) */}
        <div>
          <Label className="text-xs mb-1.5 block text-gray-500">Footer (Optional)</Label>
          <Input
            placeholder="Make your selection"
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
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500"
      />
    </div>
  )
})

ListNode.displayName = 'ListNode'
