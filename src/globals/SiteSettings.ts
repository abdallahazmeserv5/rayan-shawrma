// payload/globals/SiteSettings.ts

import { GlobalConfig } from 'payload'

const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { en: 'Site Settings', ar: 'إعدادات الموقع' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'site_name',
      type: 'text',
      localized: true,
      label: { en: 'Site Name', ar: 'اسم الموقع' },
      required: true,
    },
    {
      name: 'primary_site_logo',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Primary Site Logo', ar: 'شعار الموقع الرئيسي' },
    },
    {
      name: 'secondary_site_logo',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Secondary Site Logo', ar: 'شعار الموقع الثانوي' },
    },
    {
      name: 'site_description',
      type: 'textarea',
      localized: true,
      label: { en: 'Site Description', ar: 'وصف الموقع' },
    },
    {
      name: 'site_url',
      type: 'text',
      label: { en: 'Site URL', ar: 'رابط الموقع' },
    },
    {
      name: 'site_email',
      type: 'email',
      label: { en: 'Site Email', ar: 'البريد الإلكتروني للموقع' },
    },
    {
      name: 'site_phone',
      type: 'text',
      label: { en: 'Site Phone', ar: 'هاتف الموقع' },
    },
    {
      name: 'site_address',
      type: 'text',
      localized: true,
      label: { en: 'Site Address', ar: 'عنوان الموقع' },
    },
    {
      name: 'site_favicon',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Site Favicon', ar: 'أيقونة الموقع' },
    },
    {
      name: 'meta_title',
      type: 'text',
      localized: true,
      label: { en: 'Meta Title', ar: 'عنوان الميتا' },
    },
    {
      name: 'meta_description',
      type: 'textarea',
      localized: true,
      label: { en: 'Meta Description', ar: 'وصف الميتا' },
    },
    {
      name: 'og_image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Open Graph Image', ar: 'صورة OG' },
    },
    {
      name: 'twitter_card_image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Twitter Card Image', ar: 'صورة بطاقة تويتر' },
    },
    {
      name: 'facebook_url',
      type: 'text',
      label: { en: 'Facebook URL', ar: 'رابط فيسبوك' },
    },
    {
      name: 'twitter_url',
      type: 'text',
      label: { en: 'Twitter URL', ar: 'رابط تويتر' },
    },
    {
      name: 'instagram_url',
      type: 'text',
      label: { en: 'Instagram URL', ar: 'رابط انستجرام' },
    },
    {
      name: 'linkedin_url',
      type: 'text',
      label: { en: 'LinkedIn URL', ar: 'رابط لينكدإن' },
    },
    {
      name: 'youtube_url',
      type: 'text',
      label: { en: 'YouTube URL', ar: 'رابط يوتيوب' },
    },
    {
      name: 'latitude',
      type: 'text',
      label: { en: 'Latitude', ar: 'خط العرض' },
    },
    {
      name: 'longitude',
      type: 'text',
      label: { en: 'Longitude', ar: 'خط الطول' },
    },
    {
      name: 'google_analytics_id',
      type: 'text',
      label: { en: 'Google Analytics ID', ar: 'معرف تحليلات جوجل' },
    },
    {
      name: 'facebook_pixel_id',
      type: 'text',
      label: { en: 'Facebook Pixel ID', ar: 'معرف فيسبوك بيكسل' },
    },
    {
      name: 'google_tag_manager_id',
      type: 'text',
      label: { en: 'Google Tag Manager ID', ar: 'معرف Google Tag Manager' },
    },
    {
      name: 'pixels',
      type: 'textarea',
      label: { en: 'Custom Pixels / Scripts', ar: 'سكربتات / بيكسلات مخصصة' },
    },
  ],
}

export default SiteSettings
