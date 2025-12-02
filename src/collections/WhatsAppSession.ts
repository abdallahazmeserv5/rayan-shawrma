import type { CollectionConfig } from 'payload'

export const WhatsAppSession: CollectionConfig = {
  slug: 'whatsapp-sessions',
  labels: {
    singular: { en: 'WhatsApp Session', ar: 'جلسة واتساب' },
    plural: { en: 'WhatsApp Sessions', ar: 'جلسات واتساب' },
  },
  admin: {
    useAsTitle: 'phoneNumber',
    description: {
      en: 'Manage WhatsApp connection sessions',
      ar: 'إدارة جلسات اتصال واتساب',
    },
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
      name: 'sessionId',
      type: 'text',
      required: true,
      unique: true,
      defaultValue: 'global_session',
      label: { en: 'Session ID', ar: 'معرف الجلسة' },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'disconnected',
      options: [
        { label: { en: 'Disconnected', ar: 'غير متصل' }, value: 'disconnected' },
        { label: { en: 'Scanning', ar: 'جاري المسح' }, value: 'scanning' },
        { label: { en: 'Connected', ar: 'متصل' }, value: 'connected' },
      ],
      label: { en: 'Status', ar: 'الحالة' },
    },
    {
      name: 'phoneNumber',
      type: 'text',
      label: { en: 'Phone Number', ar: 'رقم الهاتف' },
      admin: {
        description: {
          en: 'Connected WhatsApp phone number',
          ar: 'رقم هاتف واتساب المتصل',
        },
      },
    },
    {
      name: 'sessionData',
      type: 'textarea',
      label: { en: 'Session Data', ar: 'بيانات الجلسة' },
      admin: {
        description: {
          en: 'Encrypted Baileys auth state (do not modify)',
          ar: 'حالة المصادقة المشفرة (لا تقم بالتعديل)',
        },
        readOnly: true,
      },
    },
    {
      name: 'qrCode',
      type: 'textarea',
      label: { en: 'QR Code', ar: 'رمز الاستجابة السريعة' },
      admin: {
        description: {
          en: 'Base64 QR code image (temporary)',
          ar: 'صورة رمز الاستجابة السريعة (مؤقت)',
        },
        readOnly: true,
      },
    },
    {
      name: 'lastConnectedAt',
      type: 'date',
      label: { en: 'Last Connected At', ar: 'آخر اتصال في' },
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
  timestamps: true,
}
