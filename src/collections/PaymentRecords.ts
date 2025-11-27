import type { CollectionConfig } from 'payload'

export const PaymentRecords: CollectionConfig = {
  slug: 'payment-records',
  labels: {
    singular: { en: 'Payment Record', ar: 'سجل دفع' },
    plural: { en: 'Payment Records', ar: 'سجلات الدفع' },
  },
  admin: {
    useAsTitle: 'invoiceId',
    defaultColumns: ['invoiceId', 'order', 'status', 'amount', 'createdAt'],
    group: { en: 'Orders', ar: 'الطلبات' },
  },
  access: {
    read: ({ req: { user } }) => !!user, // Only admins can read
    create: ({ req: { user } }) => !!user, // Only admins/system can create
    update: ({ req: { user } }) => !!user, // Only admins can update
    delete: ({ req: { user } }) => !!user, // Only admins can delete
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      label: { en: 'Order', ar: 'الطلب' },
      admin: {
        description: {
          en: 'The order this payment is for',
          ar: 'الطلب الذي يتعلق به هذا الدفع',
        },
      },
    },
    {
      name: 'gateway',
      type: 'select',
      required: true,
      defaultValue: 'myfatoorah',
      options: [
        {
          label: { en: 'MyFatoorah', ar: 'ماي فاتورة' },
          value: 'myfatoorah',
        },
      ],
      label: { en: 'Payment Gateway', ar: 'بوابة الدفع' },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'invoiceId',
      type: 'text',
      label: { en: 'Invoice ID', ar: 'رقم الفاتورة' },
      admin: {
        description: {
          en: 'Payment gateway invoice/transaction ID',
          ar: 'رقم الفاتورة/المعاملة من بوابة الدفع',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        {
          label: { en: 'Pending', ar: 'قيد الانتظار' },
          value: 'pending',
        },
        {
          label: { en: 'Success', ar: 'نجح' },
          value: 'success',
        },
        {
          label: { en: 'Failed', ar: 'فشل' },
          value: 'failed',
        },
        {
          label: { en: 'Cancelled', ar: 'ملغي' },
          value: 'cancelled',
        },
      ],
      label: { en: 'Payment Status', ar: 'حالة الدفع' },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'amount',
      type: 'number',
      min: 0,
      label: { en: 'Amount', ar: 'المبلغ' },
      admin: {
        description: {
          en: 'Payment amount',
          ar: 'مبلغ الدفع',
        },
        step: 0.001,
      },
    },
    {
      name: 'payload',
      type: 'json',
      label: { en: 'Gateway Response', ar: 'استجابة البوابة' },
      admin: {
        description: {
          en: 'Full response from payment gateway',
          ar: 'الاستجابة الكاملة من بوابة الدفع',
        },
        readOnly: true,
      },
    },
  ],
}
