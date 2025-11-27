'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function createLocation(data: {
  customer: string
  description: string
  lat: number
  lng: number
}) {
  try {
    const payload = await getPayload({ config })

    const location = await payload.create({
      collection: 'locations',
      data: {
        customer: data.customer,
        description: data.description,
        lat: data.lat,
        lng: data.lng,
      },
    })

    return {
      success: true,
      location,
    }
  } catch (error) {
    console.error('Error creating location:', error)
    return {
      success: false,
      error: 'Failed to create location',
      location: null,
    }
  }
}

export async function getCustomerLocations(customerId: string) {
  try {
    const payload = await getPayload({ config })

    const { docs } = await payload.find({
      collection: 'locations',
      where: {
        customer: {
          equals: customerId,
        },
      },
      limit: 50,
    })

    return {
      success: true,
      locations: docs,
    }
  } catch (error) {
    console.error('Error fetching locations:', error)
    return {
      success: false,
      error: 'Failed to fetch locations',
      locations: [],
    }
  }
}
