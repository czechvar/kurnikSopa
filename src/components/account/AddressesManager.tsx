import type { User } from '@/payload-types'

export function AddressesManager(_: { userId: number; defaultAddresses: NonNullable<User['addresses']> }) {
  return null
}
