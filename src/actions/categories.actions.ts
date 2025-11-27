'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function getCategories(locale: 'ar' | 'en' = 'ar') {
  try {
    const payload = await getPayload({ config })

    const { docs } = await payload.find({
      collection: 'categories',
      where: {
        active: {
          equals: true,
        },
      },
      locale,
      depth: 1,
      limit: 100,
      sort: 'order',
    })

    return {
      success: true,
      categories: docs,
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
    return {
      success: false,
      error: 'Failed to fetch categories',
      categories: [],
    }
  }
}
