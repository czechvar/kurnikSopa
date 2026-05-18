import type { Payload } from 'payload'
import type { Cart, Product, User } from '@/payload-types'

let userCounter = 0
let productCounter = 0

export async function createTestUser(
  payload: Payload,
  overrides: Partial<{
    email: string
    password: string
    role: 'admin' | 'staff' | 'customer'
    firstName: string
    lastName: string
    phone: string
  }> = {},
): Promise<User> {
  userCounter += 1
  return payload.create({
    collection: 'users',
    data: {
      email: overrides.email ?? `test-user-${userCounter}@kurnik-sopa.cz`,
      password: overrides.password ?? 'test-password-min-8',
      role: overrides.role ?? 'customer',
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? `User${userCounter}`,
      phone: overrides.phone ?? '+420123456789',
    } as any,
  })
}

export async function createTestProduct(
  payload: Payload,
  overrides: Partial<{
    name: string
    slug: string
    price: number
    unit: 'kg' | 'ks' | 'l' | 'baleni'
    inStock: boolean
    stockQuantity: number | null
    minimumOrder: number | null
    seasonal: boolean
    availableFrom: string | null
    availableTo: string | null
    status: 'draft' | 'published'
  }> = {},
): Promise<Product> {
  productCounter += 1
  const nameBase = overrides.name ?? `Test Product ${productCounter}`
  return payload.create({
    collection: 'products',
    // name is localized: true — must supply locale-keyed object
    locale: 'cs',
    data: {
      name: nameBase,
      slug: overrides.slug ?? `test-product-${productCounter}`,
      price: overrides.price ?? 100,
      unit: overrides.unit ?? 'ks',
      inStock: overrides.inStock ?? true,
      stockQuantity: overrides.stockQuantity ?? 100,
      minimumOrder: overrides.minimumOrder ?? null,
      seasonal: overrides.seasonal ?? false,
      availableFrom: overrides.availableFrom ?? null,
      availableTo: overrides.availableTo ?? null,
      status: overrides.status ?? 'published',
    } as any,
  })
}

export async function setTestSiteSettings(payload: Payload): Promise<void> {
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      farmName: 'Kurník Šopa (test)',
      contact: { phone: '+420123456789', email: 'test@kurnik-sopa.cz' },
      address: { street: 'Test 1', city: 'Praha', zip: '11000' },
      notificationEmail: 'staff@kurnik-sopa.cz',
      payment: {
        bankName: 'KB',
        accountPrefix: '',
        accountNumber: '2901234567',
        bankCode: '2010',
      },
      owner: 'Test Owner',
    } as any,
  })
}

export async function createTestCart(
  payload: Payload,
  user: User,
  items: Array<{ product: Product; quantity: number }>,
): Promise<Cart> {
  return payload.create({
    collection: 'carts',
    data: {
      user: user.id,
      items: items.map(it => ({ product: it.product.id, quantity: it.quantity })),
    } as any,
  })
}
