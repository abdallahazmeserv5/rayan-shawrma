import config from '@payload-config'
import { getPayload } from 'payload'

export function getConfiguredPayload() {
  return getPayload({ config })
}
