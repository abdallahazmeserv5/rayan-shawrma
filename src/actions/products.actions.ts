'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function getProducts(locale: 'ar' | 'en' = 'ar', categoryId?: string) {
  try {
    const payload = await getPayload({ config })

    const whereClause: any = {
      active: {
        equals: true,
      },
    }

    // Add category filter if provided
    if (categoryId) {
      whereClause.category = {
        equals: categoryId,
      }
    }

    const { docs } = await payload.find({
      collection: 'products',
      where: whereClause,
      locale,
      depth: 2, // Include category and image
      limit: 100,
    })

    return {
      success: true,
      products: docs,
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return {
      success: false,
      error: 'Failed to fetch products',
      products: [],
    }
  }
}

export async function getProductById(id: string, locale: 'ar' | 'en' = 'ar') {
  try {
    const payload = await getPayload({ config })

    const product = await payload.findByID({
      collection: 'products',
      id,
      locale,
      depth: 1,
    })

    return {
      success: true,
      product,
    }
  } catch (error) {
    console.error('Error fetching product:', error)
    return {
      success: false,
      error: 'Product not found',
      product: null,
    }
  }
}
