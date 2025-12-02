import type { CollectionConfig } from 'payload'

export const WhatsAppMessages: CollectionConfig = {
  slug: 'whatsapp-messages',
  labels: {
    singular: { en: 'WhatsApp Message', ar: 'رسالة واتساب' },
    plural: { en: 'WhatsApp Messages', ar: 'رسائل واتساب' },
  },
  admin: {
    useAsTitle: 'to',
    description: {
      en: 'History of sent WhatsApp messages',
      ar: 'سجل رسائل واتساب المرسلة',
    },
    defaultColumns: ['to', 'message', 'status', 'sentAt'],
  },
  access: {
    // Only authenticated users can access
    read: ({ req: { user } }) => {
      return !!user
    },
    create: ({ req: { user } }) => {
      return !!user
    },
    update: ({ req: { user } }) => {
      return !!user
    },
    delete: ({ req: { user } }) => {
      return !!user
    },
  },
  fields: [
    {
      name: 'to',
      type: 'text',
      required: true,
      label: { en: 'To', ar: 'إلى' },
      admin: {
        description: {
          en: 'Recipient phone number',
          ar: 'رقم هاتف المستلم',
        },
      },
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      label: { en: 'Message', ar: 'الرسالة' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: { en: 'Pending', ar: 'قيد الانتظار' }, value: 'pending' },
        { label: { en: 'Sent', ar: 'تم الإرسال' }, value: 'sent' },
        { label: { en: 'Failed', ar: 'فشل' }, value: 'failed' },
      ],
      label: { en: 'Status', ar: 'الحالة' },
    },
    {
      name: 'sentBy',
      type: 'relationship',
      relationTo: 'users',
      label: { en: 'Sent By', ar: 'أرسلت بواسطة' },
      admin: {
        description: {
          en: 'User who sent the message',
          ar: 'المستخدم الذي أرسل الرسالة',
        },
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: { en: 'Sent At', ar: 'أرسلت في' },
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'error',
      type: 'textarea',
      label: { en: 'Error', ar: 'خطأ' },
      admin: {
        description: {
          en: 'Error message if sending failed',
          ar: 'رسالة الخطأ في حالة فشل الإرسال',
        },
        condition: (data) => data.status === 'failed',
      },
    },
  ],
  timestamps: true,
}
