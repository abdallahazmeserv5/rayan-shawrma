'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function getStoreSettings(locale: 'ar' | 'en' = 'ar') {
  try {
    const payload = await getPayload({ config })

    const settings = await payload.findGlobal({
      slug: 'store-settings',
      locale,
      depth: 0,
    })

    // Exclude sensitive fields
    const { myFatoorahApiKey, ...publicSettings } = settings as any

    return {
      success: true,
      settings: publicSettings,
    }
  } catch (error) {
    console.error('Error fetching store settings:', error)
    return {
      success: false,
      error: 'Failed to fetch store settings',
      settings: null,
    }
  }
}

export async function getStoreSettingsInternal() {
  try {
    const payload = await getPayload({ config })

    const settings = await payload.findGlobal({
      slug: 'store-settings',
      depth: 0,
    })

    return settings
  } catch (error) {
    console.error('Error fetching store settings:', error)
    return null
  }
}
