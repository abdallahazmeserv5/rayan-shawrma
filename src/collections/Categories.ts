import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: { en: 'Category', ar: 'فئة' },
    plural: { en: 'Categories', ar: 'الفئات' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'active', 'updatedAt'],
  },
  access: {
    read: () => true, // Public read access
    create: ({ req: { user } }) => !!user, // Only admins can create
    update: ({ req: { user } }) => !!user, // Only admins can update
    delete: ({ req: { user } }) => !!user, // Only admins can delete
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Category Name', ar: 'اسم الفئة' },
      admin: {
        description: {
          en: 'The name of the category',
          ar: 'اسم الفئة',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      label: { en: 'Description', ar: 'الوصف' },
      admin: {
        description: {
          en: 'A brief description of the category',
          ar: 'وصف مختصر للفئة',
        },
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Category Image', ar: 'صورة الفئة' },
      admin: {
        description: {
          en: 'Optional image for the category',
          ar: 'صورة اختيارية للفئة',
        },
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: { en: 'Active', ar: 'نشط' },
      admin: {
        description: {
          en: 'Only active categories will be shown',
          ar: 'الفئات النشطة فقط ستظهر',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: { en: 'Display Order', ar: 'ترتيب العرض' },
      admin: {
        description: {
          en: 'Order in which categories are displayed (lower numbers first)',
          ar: 'الترتيب الذي تظهر به الفئات (الأرقام الأقل أولاً)',
        },
        position: 'sidebar',
      },
    },
  ],
}
