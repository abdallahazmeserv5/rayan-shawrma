import type { CollectionConfig } from 'payload'

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: {
    singular: { en: 'Customer', ar: 'عميل' },
    plural: { en: 'Customers', ar: 'العملاء' },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'phone2', 'createdAt'],
  },
  access: {
    read: () => true, // Public read (needed for checkout)
    create: () => true, // Public create (for new customers during checkout)
    update: ({ req: { user } }) => !!user, // Only admins can update
    delete: ({ req: { user } }) => !!user, // Only admins can delete
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: { en: 'Customer Name', ar: 'اسم العميل' },
      admin: {
        description: {
          en: 'Full name of the customer',
          ar: 'الاسم الكامل للعميل',
        },
      },
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { en: 'Phone Number', ar: 'رقم الهاتف' },
      admin: {
        description: {
          en: 'Primary phone number (must be unique)',
          ar: 'رقم الهاتف الأساسي (يجب أن يكون فريداً)',
        },
      },
      validate: (value: string | null | undefined) => {
        if (!value) return 'Phone number is required'
        // Basic validation - you can enhance this based on your region
        if (value.length < 8) return 'Phone number is too short'
        return true
      },
    },
    {
      name: 'phone2',
      type: 'text',
      label: { en: 'Secondary Phone', ar: 'رقم الهاتف الثانوي' },
      admin: {
        description: {
          en: 'Optional secondary phone number',
          ar: 'رقم هاتف ثانوي اختياري',
        },
      },
    },
    {
      name: 'locations',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      label: { en: 'Saved Locations', ar: 'المواقع المحفوظة' },
      admin: {
        description: {
          en: "Customer's saved delivery locations",
          ar: 'مواقع التوصيل المحفوظة للعميل',
        },
        readOnly: true, // Managed through locations collection
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Normalize phone number (remove spaces, dashes, etc.)
        if (data?.phone) {
          data.phone = data.phone.replace(/[\s-()]/g, '')
        }
        if (data?.phone2) {
          data.phone2 = data.phone2.replace(/[\s-()]/g, '')
        }
        return data
      },
    ],
  },
}
