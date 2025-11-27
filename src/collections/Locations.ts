import type { CollectionConfig } from 'payload'

export const Locations: CollectionConfig = {
  slug: 'locations',
  labels: {
    singular: { en: 'Location', ar: 'موقع' },
    plural: { en: 'Locations', ar: 'المواقع' },
  },
  admin: {
    useAsTitle: 'description',
    defaultColumns: ['description', 'customer', 'lat', 'lng', 'createdAt'],
  },
  access: {
    read: () => true, // Public read (needed for checkout)
    create: () => true, // Public create (for new locations during checkout)
    update: ({ req: { user } }) => !!user, // Only admins can update
    delete: ({ req: { user } }) => !!user, // Only admins can delete
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'customers',
      required: true,
      label: { en: 'Customer', ar: 'العميل' },
      admin: {
        description: {
          en: 'The customer who owns this location',
          ar: 'العميل الذي يملك هذا الموقع',
        },
      },
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      label: { en: 'Address Description', ar: 'وصف العنوان' },
      admin: {
        description: {
          en: 'E.g., "Home", "Office", "Building 5, Apartment 12"',
          ar: 'مثال: "المنزل"، "المكتب"، "مبنى 5، شقة 12"',
        },
        placeholder: {
          en: 'Enter address description',
          ar: 'أدخل وصف العنوان',
        },
      },
    },
    {
      name: 'lat',
      type: 'number',
      required: true,
      label: { en: 'Latitude', ar: 'خط العرض' },
      admin: {
        description: {
          en: 'Latitude coordinate',
          ar: 'إحداثي خط العرض',
        },
        step: 0.000001,
      },
      validate: (value: any) => {
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
      admin: {
        description: {
          en: 'Longitude coordinate',
          ar: 'إحداثي خط الطول',
        },
        step: 0.000001,
      },
      validate: (value: number | null | undefined) => {
        if (value === undefined || value === null) return 'Longitude is required'
        if (value < -180 || value > 180) return 'Longitude must be between -180 and 180'
        return true
      },
    },
  ],
}
