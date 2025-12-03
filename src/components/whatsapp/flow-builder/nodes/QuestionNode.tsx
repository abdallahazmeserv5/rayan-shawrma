import { memo, useState, useEffect } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import {
  MessageSquare,
  CircleHelp,
  FileText,
  List,
  MousePointerClick,
  Plus,
  Trash,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export const QuestionNode = memo(({ id, data, isConnectable }: any) => {
  const { setNodes } = useReactFlow()
  const [messageType, setMessageType] = useState(data.messageType || 'text')

  useEffect(() => {
    setMessageType(data.messageType || 'text')
  }, [data.messageType])

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

  const handleTypeChange = (value: string) => {
    setMessageType(value)
    updateData({ messageType: value })
  }

  const addButton = () => {
    const buttons = data.buttons || []
    if (buttons.length < 3) {
      updateData({
        buttons: [...buttons, { id: Date.now().toString(), type: 'reply', title: '' }],
      })
    }
  }

  const updateButton = (index: number, field: string, value: string) => {
    const buttons = [...(data.buttons || [])]
    buttons[index] = { ...buttons[index], [field]: value }
    updateData({ buttons })
  }

  const removeButton = (index: number) => {
    const buttons = [...(data.buttons || [])]
    buttons.splice(index, 1)
    updateData({ buttons })
  }

  const addListSection = () => {
    const sections = data.sections || []
    updateData({
      sections: [...sections, { title: '', rows: [] }],
    })
  }

  const updateSectionTitle = (index: number, title: string) => {
    const sections = [...(data.sections || [])]
    sections[index] = { ...sections[index], title }
    updateData({ sections })
  }

  const addListRow = (sectionIndex: number) => {
    const sections = [...(data.sections || [])]
    sections[sectionIndex].rows.push({ title: '', description: '', id: Date.now().toString() })
    updateData({ sections })
  }

  const updateListRow = (sectionIndex: number, rowIndex: number, field: string, value: string) => {
    const sections = [...(data.sections || [])]
    sections[sectionIndex].rows[rowIndex] = {
      ...sections[sectionIndex].rows[rowIndex],
      [field]: value,
    }
    updateData({ sections })
  }

  const removeListRow = (sectionIndex: number, rowIndex: number) => {
    const sections = [...(data.sections || [])]
    sections[sectionIndex].rows.splice(rowIndex, 1)
    updateData({ sections })
  }

  const removeSection = (index: number) => {
    const sections = [...(data.sections || [])]
    sections.splice(index, 1)
    updateData({ sections })
  }

  return (
    <div className="w-[350px] bg-white rounded-lg border border-purple-200 shadow-md overflow-hidden">
      <div className="bg-purple-50 p-3 border-b border-purple-100 flex items-center justify-between handle drag-handle cursor-move">
        <div className="flex items-center gap-2 text-purple-800">
          <CircleHelp size={16} />
          <span className="font-medium text-sm">Ask Question</span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <Label className="text-xs mb-1.5 block text-purple-700 font-medium">
            Save Response To Variable
          </Label>
          <Input
            placeholder="e.g. user_name, email, age"
            value={data.variable || ''}
            onChange={(e) => updateData({ variable: e.target.value })}
            className="border-purple-200 focus-visible:ring-purple-500"
          />
          <p className="text-[10px] text-gray-400 mt-1">Variable name to store the user's answer</p>
        </div>

        <Tabs value={messageType} onValueChange={handleTypeChange} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 h-auto p-1">
            <TabsTrigger value="text" title="Text">
              <FileText size={14} />
            </TabsTrigger>
            <TabsTrigger value="buttons" title="Buttons">
              <MousePointerClick size={14} />
            </TabsTrigger>
            <TabsTrigger value="list" title="List">
              <List size={14} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-0">
            <Label className="text-xs mb-1.5 block text-gray-500">Question Text</Label>
            <Textarea
              placeholder="What is your name?"
              className="min-h-[100px] text-sm resize-none"
              value={data.text || ''}
              onChange={(e) => updateData({ text: e.target.value })}
            />
          </TabsContent>

          <TabsContent value="buttons" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Question Text</Label>
                <Textarea
                  placeholder="Please select an option:"
                  className="min-h-[60px] text-sm resize-none"
                  value={data.text || ''}
                  onChange={(e) => updateData({ text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 flex justify-between items-center">
                  Options (Max 3)
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={addButton}
                    disabled={(data.buttons?.length || 0) >= 3}
                  >
                    <Plus size={14} />
                  </Button>
                </Label>

                {(data.buttons || []).map((btn: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={btn.title}
                      onChange={(e) => updateButton(idx, 'title', e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeButton(idx)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Question Text</Label>
                <Textarea
                  placeholder="Please select from the list:"
                  className="min-h-[60px] text-sm resize-none"
                  value={data.text || ''}
                  onChange={(e) => updateData({ text: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs mb-1.5 block text-gray-500">Button Text</Label>
                  <Input
                    placeholder="Menu"
                    value={data.buttonText || ''}
                    onChange={(e) => updateData({ buttonText: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block text-gray-500">Title</Label>
                  <Input
                    placeholder="List Title"
                    value={data.title || ''}
                    onChange={(e) => updateData({ title: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-gray-500">Sections</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-xs"
                    onClick={addListSection}
                  >
                    <Plus size={12} className="mr-1" /> Add Section
                  </Button>
                </div>

                {(data.sections || []).map((section: any, sIdx: number) => (
                  <Card key={sIdx} className="p-2 bg-gray-50">
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={section.title}
                        onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                        placeholder="Section Title"
                        className="h-7 text-sm bg-white"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500"
                        onClick={() => removeSection(sIdx)}
                      >
                        <Trash size={14} />
                      </Button>
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                      {(section.rows || []).map((row: any, rIdx: number) => (
                        <div key={rIdx} className="flex gap-2 items-start">
                          <div className="flex-1 space-y-1">
                            <Input
                              value={row.title}
                              onChange={(e) => updateListRow(sIdx, rIdx, 'title', e.target.value)}
                              placeholder="Row Title"
                              className="h-7 text-sm bg-white"
                            />
                            <Input
                              value={row.description}
                              onChange={(e) =>
                                updateListRow(sIdx, rIdx, 'description', e.target.value)
                              }
                              placeholder="Description (optional)"
                              className="h-7 text-xs bg-white text-gray-500"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 mt-1"
                            onClick={() => removeListRow(sIdx, rIdx)}
                          >
                            <Trash size={12} />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-xs text-gray-500 hover:text-gray-900"
                        onClick={() => addListRow(sIdx)}
                      >
                        <Plus size={12} className="mr-1" /> Add Row
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
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

QuestionNode.displayName = 'QuestionNode'
