import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: { en: 'Product', ar: 'منتج' },
    plural: { en: 'Products', ar: 'المنتجات' },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'price', 'active', 'updatedAt'],
  },
  access: {
    read: () => true, // Public read access
    create: ({ req: { user } }) => !!user, // Only admins can create
    update: ({ req: { user } }) => !!user, // Only admins can update
    delete: ({ req: { user } }) => !!user, // Only admins can delete
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: { en: 'Product Name', ar: 'اسم المنتج' },
      admin: {
        description: {
          en: 'The name of the product as it will appear to customers',
          ar: 'اسم المنتج كما سيظهر للعملاء',
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
          en: 'A brief description of the product',
          ar: 'وصف مختصر للمنتج',
        },
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: { en: 'Category', ar: 'الفئة' },
      admin: {
        description: {
          en: 'Product category',
          ar: 'فئة المنتج',
        },
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      label: { en: 'Price', ar: 'السعر' },
      admin: {
        description: {
          en: 'Product price (will use currency from store settings)',
          ar: 'سعر المنتج (سيتم استخدام العملة من إعدادات المتجر)',
        },
        step: 0.001,
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Product Image', ar: 'صورة المنتج' },
      admin: {
        description: {
          en: 'Main product image',
          ar: 'الصورة الرئيسية للمنتج',
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
          en: 'Only active products will be shown to customers',
          ar: 'المنتجات النشطة فقط ستظهر للعملاء',
        },
        position: 'sidebar',
      },
    },
  ],
}
