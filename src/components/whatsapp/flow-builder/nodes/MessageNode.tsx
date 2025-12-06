import { memo, useState, useEffect } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import {
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileText,
  Mic,
  MapPin,
  User,
  BarChart3,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export const MessageNode = memo(({ id, data, isConnectable }: any) => {
  const { setNodes } = useReactFlow()
  const [messageType, setMessageType] = useState(data.messageType || 'text')

  // Update local state when data changes externally
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

  return (
    <div className="w-[350px] bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden">
      <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center justify-between handle drag-handle cursor-move">
        <div className="flex items-center gap-2 text-gray-700">
          <MessageSquare size={16} />
          <span className="font-medium text-sm">Send Message</span>
        </div>
        <div className="flex gap-1">{/* Status indicators could go here */}</div>
      </div>

      <div className="p-4">
        <Tabs value={messageType} onValueChange={handleTypeChange} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4 h-auto p-1">
            <TabsTrigger value="text" title="Text">
              <FileText size={14} />
            </TabsTrigger>
            <TabsTrigger value="image" title="Image">
              <ImageIcon size={14} />
            </TabsTrigger>
            <TabsTrigger value="video" title="Video">
              <Video size={14} />
            </TabsTrigger>
            <TabsTrigger value="document" title="Document">
              <FileText size={14} className="text-blue-500" />
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-4 mb-4 h-auto p-1 mt-2">
            <TabsTrigger value="audio" title="Audio">
              <Mic size={14} />
            </TabsTrigger>
            <TabsTrigger value="location" title="Location">
              <MapPin size={14} />
            </TabsTrigger>
            <TabsTrigger value="contact" title="Contact">
              <User size={14} />
            </TabsTrigger>
            <TabsTrigger value="poll" title="Poll">
              <BarChart3 size={14} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-0">
            <Label className="text-xs mb-1.5 block text-gray-500">Message Text</Label>
            <Textarea
              placeholder="Hello {{name}}, how can I help you?"
              className="min-h-[100px] text-sm resize-none"
              value={data.text || ''}
              onChange={(e) => updateData({ text: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 mt-1">Supports variables like {'{{name}}'}</p>
          </TabsContent>

          <TabsContent value="image" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Image URL</Label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={data.url || ''}
                  onChange={(e) => updateData({ url: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Caption (Optional)</Label>
                <Textarea
                  placeholder="Image caption..."
                  className="min-h-[60px] text-sm resize-none"
                  value={data.caption || ''}
                  onChange={(e) => updateData({ caption: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Video URL</Label>
                <Input
                  placeholder="https://example.com/video.mp4"
                  value={data.url || ''}
                  onChange={(e) => updateData({ url: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Caption (Optional)</Label>
                <Textarea
                  placeholder="Video caption..."
                  className="min-h-[60px] text-sm resize-none"
                  value={data.caption || ''}
                  onChange={(e) => updateData({ caption: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="document" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Document URL</Label>
                <Input
                  placeholder="https://example.com/file.pdf"
                  value={data.url || ''}
                  onChange={(e) => updateData({ url: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Filename</Label>
                <Input
                  placeholder="document.pdf"
                  value={data.fileName || ''}
                  onChange={(e) => updateData({ fileName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">MIME Type (Optional)</Label>
                <Input
                  placeholder="application/pdf"
                  value={data.mimetype || ''}
                  onChange={(e) => updateData({ mimetype: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Audio URL</Label>
                <Input
                  placeholder="https://example.com/audio.mp3"
                  value={data.url || ''}
                  onChange={(e) => updateData({ url: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ptt-checkbox"
                  checked={data.ptt || false}
                  onChange={(e) => updateData({ ptt: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="ptt-checkbox" className="text-xs text-gray-500">
                  Play as voice message (PTT)
                </Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="mt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs mb-1.5 block text-gray-500">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="31.5"
                    value={data.latitude || ''}
                    onChange={(e) => updateData({ latitude: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block text-gray-500">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="34.5"
                    value={data.longitude || ''}
                    onChange={(e) => updateData({ longitude: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">
                  Location Name (Optional)
                </Label>
                <Input
                  placeholder="Restaurant Name"
                  value={data.name || ''}
                  onChange={(e) => updateData({ name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Address (Optional)</Label>
                <Input
                  placeholder="123 Main St, City"
                  value={data.address || ''}
                  onChange={(e) => updateData({ address: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">vCard Data</Label>
                <Textarea
                  placeholder={`BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEND:VCARD`}
                  className="min-h-[120px] text-sm resize-none font-mono"
                  value={data.vcard || ''}
                  onChange={(e) => updateData({ vcard: e.target.value })}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Enter vCard format contact information
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="poll" className="mt-0">
            <div className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Poll Question</Label>
                <Input
                  placeholder="What's your favorite color?"
                  value={data.name || ''}
                  onChange={(e) => updateData({ name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">
                  Options (comma-separated)
                </Label>
                <Textarea
                  placeholder="Red, Blue, Green, Yellow"
                  className="min-h-[80px] text-sm resize-none"
                  value={(data.options || []).join(', ')}
                  onChange={(e) =>
                    updateData({ options: e.target.value.split(',').map((s) => s.trim()) })
                  }
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block text-gray-500">Max Selections</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={data.selectableCount || 1}
                  onChange={(e) => updateData({ selectableCount: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
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

MessageNode.displayName = 'MessageNode'
