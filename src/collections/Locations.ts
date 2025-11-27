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
      'lat',
      'lng',
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
    // New Address Structure Fields
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
        placeholder: { en: 'Enter address description', ar: 'أدخل وصف العنوان' },
      },
    },

    // -------------------------
    // Coordinates
    // -------------------------
    {
      name: 'lat',
      type: 'number',
      required: true,
      label: { en: 'Latitude', ar: 'خط العرض' },
      admin: { step: 0.000001 },
      validate: (value: number | null | undefined) => {
        if (value === undefined || value === null) return 'Latitude is required'
        if (value < -90 || value > 90) return 'Latitude must be between -90 and 90'
        return true
      },
    },
    {
      name: 'lng',
      type: 'number',
      required: true,
      label: { en: 'Longitude', ar: 'خط الطول' },
      admin: { step: 0.000001 },
      validate: (value: number | null | undefined) => {
        if (value === undefined || value === null) return 'Longitude is required'
        if (value < -180 || value > 180) return 'Longitude must be between -180 and 180'
        return true
      },
    },
  ],
}
