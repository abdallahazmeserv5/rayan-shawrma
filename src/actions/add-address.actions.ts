'use server'

import { getCustomerByPhone, createCustomer } from './customers.actions'
import { createLocation } from './locations.actions'

interface AddAddressData {
  phone: string
  name?: string
  location: {
    description: string
    city: string
    neighborhood: string
    street: string
    apartmentNumber?: string
  }
}

export async function addAddress(data: AddAddressData) {
  try {
    // -----------------------------
    // 1. Get or create customer
    // -----------------------------
    const customerResult = await getCustomerByPhone(data.phone)
    let customer = customerResult.customer

    if (!customer) {
      if (!data.name) {
        return { success: false, error: 'Customer name is required for new customers' }
      }

      const created = await createCustomer({
        name: data.name,
        phone: data.phone,
      })

      if (!created.success || !created.customer) {
        return { success: false, error: created.error || 'Failed to create customer' }
      }

      customer = created.customer
    }

    // -----------------------------
    // 2. Create new location
    // -----------------------------
    const locationResult = await createLocation({
      customer: customer.id,
      description: data.location.description,
      city: data.location.city,
      neighborhood: data.location.neighborhood,
      street: data.location.street,
      apartmentNumber: data.location.apartmentNumber || '',
    })

    if (!locationResult.success || !locationResult.location) {
      return { success: false, error: locationResult.error || 'Failed to create location' }
    }

    return {
      success: true,
      location: locationResult.location,
      customer,
    }
  } catch (error) {
    console.error('Add address error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add address',
    }
  }
}
