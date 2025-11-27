import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { en: 'User', ar: 'مستخدم' },
    plural: { en: 'Users', ar: 'المستخدمون' },
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email is added by default by Payload
    // Add more fields as needed, for example:
    {
      name: 'firstName',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'First Name', ar: 'الاسم الأول' },
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Last Name', ar: 'اسم العائلة' },
    },
  ],
}
