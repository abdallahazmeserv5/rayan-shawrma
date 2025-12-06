// Message content types for WhatsApp
export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'video'; url: string; caption?: string }
  | { type: 'audio'; url: string; ptt?: boolean }
  | { type: 'document'; url: string; fileName: string; mimetype?: string }
  | { type: 'location'; latitude: number; longitude: number; name?: string; address?: string }
  | { type: 'contact'; vcard: string }
  | { type: 'poll'; name: string; options: string[]; selectableCount?: number }
  | { type: 'buttons'; text: string; buttons: { id: string; text: string }[]; footer?: string }
  | {
      type: 'list'
      text: string
      buttonText: string
      sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
      footer?: string
    }
