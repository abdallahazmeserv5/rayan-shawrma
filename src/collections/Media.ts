import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Media', ar: 'وسائط' },
    plural: { en: 'Media Items', ar: 'الوسائط' },
  },
  access: {
    read: () => true, // Everyone can read
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Alt Text', ar: 'النص البديل' },
      admin: {
        description: {
          en: 'A descriptive text for the media (image/video) for accessibility',
          ar: 'نص وصفي للوسائط (صورة/فيديو) لأغراض الوصولية',
        },
      },
    },
  ],
  upload: {
    // disableLocalStorage: true, // Uncomment if needed
    // Accept both images and videos
    mimeTypes: [
      'image/*',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
    ],
  },
}
