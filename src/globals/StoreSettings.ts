// payload/globals/StoreSettings.ts

import { GlobalConfig } from 'payload'

const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: { en: 'Store Settings', ar: 'إعدادات المتجر' },
  access: {
    read: () => true, // Public read (needed for checkout to get delivery fee, currency, etc.)
    update: ({ req: { user } }) => !!user, // Only admins can update
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'General', ar: 'عام' },
          fields: [
            {
              name: 'restaurantName',
              type: 'text',
              localized: true,
              required: true,
              label: { en: 'Restaurant Name', ar: 'اسم المطعم' },
              admin: {
                description: {
                  en: 'Your restaurant/store name',
                  ar: 'اسم مطعمك/متجرك',
                },
              },
            },
            {
              name: 'currency',
              type: 'text',
              required: true,
              defaultValue: 'KWD',
              label: { en: 'Currency', ar: 'العملة' },
              admin: {
                description: {
                  en: 'Currency code (e.g., KWD, SAR, USD)',
                  ar: 'رمز العملة (مثال: KWD، SAR، USD)',
                },
                placeholder: 'KWD',
              },
            },
            {
              name: 'deliveryFee',
              type: 'number',
              required: true,
              defaultValue: 0,
              min: 0,
              label: { en: 'Delivery Fee', ar: 'رسوم التوصيل' },
              admin: {
                description: {
                  en: 'Fixed delivery fee added to all orders',
                  ar: 'رسوم التوصيل الثابتة المضافة لجميع الطلبات',
                },
                step: 0.001,
              },
            },
          ],
        },
        {
          label: { en: 'MyFatoorah Settings', ar: 'إعدادات ماي فاتورة' },
          fields: [
            {
              name: 'myFatoorahApiKey',
              type: 'text',
              label: { en: 'MyFatoorah API Key', ar: 'مفتاح API لماي فاتورة' },
              admin: {
                description: {
                  en: 'Your MyFatoorah API key',
                  ar: 'مفتاح API الخاص بك من ماي فاتورة',
                },
                placeholder:
                  'rLtt6JWvbUHDDhsZnfpAhpYk4dxYDQkbcPTyGaKp2TYqQgG7FGZ5Th_WD53Oq8Ebz6A53njUoo1w3pjU1D4vs8_a6',
              },
            },
            {
              name: 'myFatoorahTestMode',
              type: 'checkbox',
              defaultValue: true,
              label: { en: 'Test Mode', ar: 'وضع الاختبار' },
              admin: {
                description: {
                  en: 'Enable test mode for MyFatoorah (disable for production)',
                  ar: 'تفعيل وضع الاختبار لماي فاتورة (قم بإلغاء التفعيل للإنتاج)',
                },
              },
            },
            {
              name: 'myFatoorahCallbackUrl',
              type: 'text',
              label: { en: 'Success Callback URL', ar: 'رابط النجاح' },
              admin: {
                description: {
                  en: 'URL to redirect after successful payment',
                  ar: 'الرابط للتوجيه بعد الدفع الناجح',
                },
                placeholder: 'https://yourdomain.com/payment/success',
              },
            },
            {
              name: 'myFatoorahErrorUrl',
              type: 'text',
              label: { en: 'Error Callback URL', ar: 'رابط الخطأ' },
              admin: {
                description: {
                  en: 'URL to redirect after payment failure',
                  ar: 'الرابط للتوجيه بعد فشل الدفع',
                },
                placeholder: 'https://yourdomain.com/payment/error',
              },
            },
          ],
        },
        {
          label: { en: 'WhatsApp', ar: 'واتساب' },
          fields: [
            {
              name: 'whatsappTemplate',
              type: 'textarea',
              label: { en: 'Order Notification Template', ar: 'قالب إشعار الطلب' },
              admin: {
                description: {
                  en: 'Template for WhatsApp order notifications. Use {{variable}} for dynamic values.',
                  ar: 'قالب إشعارات الطلبات عبر واتساب. استخدم {{variable}} للقيم الديناميكية.',
                },
                placeholder: `New Order #{{orderId}}
Customer: {{customerName}}
Phone: {{phone}}
Total: {{total}} {{currency}}
Payment: {{paymentMethod}}
Items:
{{items}}`,
              },
            },
          ],
        },
      ],
    },
  ],
}

export default StoreSettings
