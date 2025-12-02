'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function getLocationsByPhone(phone: string) {
  try {
    const payload = await getPayload({ config })

    // First, find the customer by phone
    const { docs: customers } = await payload.find({
      collection: 'customers',
      where: {
        phone: {
          equals: phone,
        },
      },
      limit: 1,
    })

    if (!customers || customers.length === 0) {
      return {
        success: true,
        locations: [],
        customer: null,
      }
    }

    const customer = customers[0]

    // Fetch locations for this customer
    const { docs: locations } = await payload.find({
      collection: 'locations',
      where: {
        customer: {
          equals: customer.id,
        },
      },
      limit: 50,
    })

    return {
      success: true,
      locations,
      customer,
    }
  } catch (error) {
    console.error('Error fetching locations by phone:', error)
    return {
      success: false,
      error: 'Failed to fetch locations',
      locations: [],
      customer: null,
    }
  }
}
