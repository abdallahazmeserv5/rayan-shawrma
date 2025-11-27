import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: { en: 'Order', ar: 'طلب' },
    plural: { en: 'Orders', ar: 'الطلبات' },
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['id', 'customer', 'total', 'paymentStatus', 'orderStatus', 'createdAt'],
    listSearchableFields: ['phone', 'id'],
  },
  access: {
    read: ({ req: { user } }) => {
      // Admins can read all, public can't read (orders are created but not queried publicly)
      if (user) return true
      return false
    },
    create: () => true, // Public create (for checkout)
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
          en: 'The customer who placed this order',
          ar: 'العميل الذي قام بهذا الطلب',
        },
      },
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      label: { en: 'Phone Number', ar: 'رقم الهاتف' },
      admin: {
        description: {
          en: 'Phone number at time of order (denormalized for history)',
          ar: 'رقم الهاتف وقت الطلب (محفوظ للسجل)',
        },
      },
    },
    {
      name: 'phone2',
      type: 'text',
      label: { en: 'Secondary Phone', ar: 'رقم الهاتف الثانوي' },
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'locations',
      required: true,
      label: { en: 'Delivery Location', ar: 'موقع التوصيل' },
      admin: {
        description: {
          en: 'Where to deliver this order',
          ar: 'مكان توصيل هذا الطلب',
        },
      },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      label: { en: 'Order Items', ar: 'عناصر الطلب' },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
          label: { en: 'Product', ar: 'المنتج' },
        },
        {
          name: 'qty',
          type: 'number',
          required: true,
          min: 1,
          label: { en: 'Quantity', ar: 'الكمية' },
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
          label: { en: 'Unit Price', ar: 'سعر الوحدة' },
          admin: {
            description: {
              en: 'Price per unit at time of order',
              ar: 'سعر الوحدة وقت الطلب',
            },
            step: 0.001,
          },
        },
        {
          name: 'lineTotal',
          type: 'number',
          required: true,
          min: 0,
          label: { en: 'Line Total', ar: 'المجموع الفرعي' },
          admin: {
            description: {
              en: 'Quantity × Unit Price',
              ar: 'الكمية × سعر الوحدة',
            },
            step: 0.001,
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      required: true,
      min: 0,
      label: { en: 'Subtotal', ar: 'المجموع الفرعي' },
      admin: {
        description: {
          en: 'Sum of all line totals',
          ar: 'مجموع جميع العناصر',
        },
        step: 0.001,
        readOnly: true,
      },
    },
    {
      name: 'deliveryFee',
      type: 'number',
      required: true,
      min: 0,
      label: { en: 'Delivery Fee', ar: 'رسوم التوصيل' },
      admin: {
        description: {
          en: 'Delivery fee at time of order',
          ar: 'رسوم التوصيل وقت الطلب',
        },
        step: 0.001,
      },
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      min: 0,
      label: { en: 'Total', ar: 'المجموع الكلي' },
      admin: {
        description: {
          en: 'Subtotal + Delivery Fee',
          ar: 'المجموع الفرعي + رسوم التوصيل',
        },
        step: 0.001,
        readOnly: true,
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: [
        {
          label: { en: 'Cash on Delivery', ar: 'الدفع عند الاستلام' },
          value: 'cod',
        },
        {
          label: { en: 'MyFatoorah (Online Payment)', ar: 'ماي فاتورة (دفع إلكتروني)' },
          value: 'myfatoorah',
        },
      ],
      label: { en: 'Payment Method', ar: 'طريقة الدفع' },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        {
          label: { en: 'Pending', ar: 'قيد الانتظار' },
          value: 'pending',
        },
        {
          label: { en: 'Paid', ar: 'مدفوع' },
          value: 'paid',
        },
        {
          label: { en: 'Failed', ar: 'فشل' },
          value: 'failed',
        },
      ],
      label: { en: 'Payment Status', ar: 'حالة الدفع' },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'orderStatus',
      type: 'select',
      required: true,
      defaultValue: 'created',
      options: [
        {
          label: { en: 'Created', ar: 'تم الإنشاء' },
          value: 'created',
        },
        {
          label: { en: 'Preparing', ar: 'قيد التحضير' },
          value: 'preparing',
        },
        {
          label: { en: 'Dispatched', ar: 'تم الإرسال' },
          value: 'dispatched',
        },
        {
          label: { en: 'Delivered', ar: 'تم التوصيل' },
          value: 'delivered',
        },
      ],
      label: { en: 'Order Status', ar: 'حالة الطلب' },
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Calculate line totals for each item
        if (data?.items) {
          data.items = data.items.map((item: any) => ({
            ...item,
            lineTotal: (item.qty || 0) * (item.unitPrice || 0),
          }))

          // Calculate subtotal
          data.subtotal = data.items.reduce(
            (sum: number, item: any) => sum + (item.lineTotal || 0),
            0,
          )

          // Calculate total
          data.total = (data.subtotal || 0) + (data.deliveryFee || 0)
        }

        return data
      },
    ],
  },
}
