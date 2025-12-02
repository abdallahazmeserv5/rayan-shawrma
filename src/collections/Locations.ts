import type { CollectionConfig } from 'payload'

export const Locations: CollectionConfig = {
  slug: 'locations',
  labels: {
    singular: { en: 'Location', ar: 'موقع' },
    plural: { en: 'Locations', ar: 'المواقع' },
  },
  admin: {
    useAsTitle: 'description',
    defaultColumns: [
      'description',
      'customer',
      'city',
      'neighborhood',
      'street',
      'apartmentNumber',
      'createdAt',
    ],
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      label: { en: 'Customer', ar: 'العميل' },
    },

    // -------------------------
    // Modern Address Structure
    // -------------------------

    {
      name: 'city',
      type: 'text',
      required: true,
      label: { en: 'City', ar: 'المدينة' },
      admin: {
        placeholder: { en: 'Enter city', ar: 'ادخل المدينة' },
      },
    },
    {
      name: 'neighborhood',
      type: 'text',
      required: true,
      label: { en: 'Neighborhood', ar: 'الحي' },
      admin: {
        placeholder: { en: 'Enter neighborhood', ar: 'ادخل الحي' },
      },
    },
    {
      name: 'street',
      type: 'text',
      required: true,
      label: { en: 'Street', ar: 'الشارع' },
      admin: {
        placeholder: { en: 'Enter street name', ar: 'ادخل اسم الشارع' },
      },
    },
    {
      name: 'apartmentNumber',
      type: 'text',
      required: false,
      label: { en: 'Apartment Number', ar: 'رقم الشقة' },
      admin: {
        placeholder: { en: 'Optional', ar: 'اختياري' },
      },
    },

    // -------------------------
    // Description (kept)
    // -------------------------

    {
      name: 'description',
      type: 'text',
      required: true,
      label: { en: 'Address Description', ar: 'وصف العنوان' },
      admin: {
        placeholder: {
          en: 'Short description (Home, Office...)',
          ar: 'وصف مختصر (منزل، مكتب...)',
        },
      },
    },
  ],
}
