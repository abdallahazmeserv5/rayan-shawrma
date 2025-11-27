'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'

export async function getCustomerByPhone(phone: string) {
  try {
    // Normalize phone number
    const normalizedPhone = phone.replace(/[\s-()]/g, '')

    const payload = await getPayload({ config })

    const { docs } = await payload.find({
      collection: 'customers',
      where: {
        phone: {
          equals: normalizedPhone,
        },
      },
      depth: 2, // Include locations
      limit: 1,
    })

    if (docs.length === 0) {
      return {
        success: true,
        customer: null,
      }
    }

    return {
      success: true,
      customer: docs[0],
    }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return {
      success: false,
      error: 'Failed to fetch customer',
      customer: null,
    }
  }
}

export async function createCustomer(data: { name: string; phone: string; phone2?: string }) {
  try {
    const payload = await getPayload({ config })

    // Check if customer already exists
    const existing = await getCustomerByPhone(data.phone)
    if (existing.customer) {
      return {
        success: false,
        error: 'Customer with this phone number already exists',
        customer: null,
      }
    }

    const customer = await payload.create({
      collection: 'customers',
      data: {
        name: data.name,
        phone: data.phone,
        phone2: data.phone2,
      },
    })

    return {
      success: true,
      customer,
    }
  } catch (error) {
    console.error('Error creating customer:', error)
    return {
      success: false,
      error: 'Failed to create customer',
      customer: null,
    }
  }
}
