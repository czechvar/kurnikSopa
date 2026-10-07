import type { CollectionConfig, Access, FieldAccess, Where } from 'payload'
import { placeOrderEndpoint } from './endpoints/placeOrder'
import { sendStatusEmails } from './hooks/sendStatusEmails'

const adminOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'
const adminOrStaff: FieldAccess = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

/**
 * Orders are read by staff, by the customer they belong to, and by a
 * signed-in user whose email matches a guest order. Anonymous visitors never
 * list orders; a guest reaches their own order through the tokenised link in
 * the confirmation email (see `findOrderForViewer`).
 */
const isAdminOrStaffOrOrderOwner: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin' || req.user.role === 'staff') return true
  const clauses: Where[] = [{ customer: { equals: req.user.id } }]
  if (req.user.email) clauses.push({ guestEmail: { equals: req.user.email } })
  return { or: clauses }
}

const isAdminOrStaff: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: { cs: 'Objednávka', en: 'Order' },
    plural: { cs: 'Objednávky', en: 'Orders' },
  },
  access: {
    // Customers never create orders directly; they go through /api/orders/place,
    // which snapshots prices server-side. Staff may enter phone orders.
    create: isAdminOrStaff,
    read: isAdminOrStaffOrOrderOwner,
    update: isAdminOrStaff,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer', 'guestName', 'pickupPoint', 'preferredDate', 'totalAmount', 'orderStatus', 'paymentStatus'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
  },
  endpoints: [placeOrderEndpoint],
  hooks: {
    afterChange: [sendStatusEmails],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      required: true,
      label: { cs: 'Číslo objednávky', en: 'Order number' },
      access: { update: adminOnly },
      admin: { readOnly: true },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: { cs: 'Zákazník (účet)', en: 'Customer (account)' },
      access: { update: adminOnly },
      admin: { description: { cs: 'Prázdné u objednávek bez účtu — pak vyplňte jméno a telefon níže.', en: 'Empty for orders without an account — then fill in the name and phone below.' } },
    },
    {
      type: 'row',
      admin: { condition: (data) => !data?.customer },
      fields: [
        { name: 'guestName', type: 'text', label: { cs: 'Jméno a příjmení', en: 'Full name' }, access: { update: adminOnly } },
        { name: 'guestPhone', type: 'text', label: { cs: 'Telefon', en: 'Phone' }, access: { update: adminOnly } },
        { name: 'guestEmail', type: 'email', label: { cs: 'E-mail', en: 'Email' }, access: { update: adminOnly } },
      ],
    },
    {
      name: 'accessToken',
      type: 'text',
      index: true,
      access: { read: adminOrStaff, update: adminOnly },
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      label: { cs: 'Položky', en: 'Items' },
      access: { update: adminOnly },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'priceAtPurchase',
          type: 'number',
          required: true,
          admin: {
            description: { cs: 'Cena v době objednání (snapshot)', en: 'Price at the time of ordering (snapshot)' },
          },
        },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      label: { cs: 'Celkem (Kč)', en: 'Total (CZK)' },
      access: { update: adminOnly },
      admin: { position: 'sidebar' },
    },
    {
      name: 'pickupPoint',
      type: 'relationship',
      relationTo: 'pickup-points',
      label: { cs: 'Odběrné místo', en: 'Pickup point' },
      access: { update: adminOrStaff },
    },
    {
      name: 'preferredDate',
      type: 'date',
      label: { cs: 'Preferovaný den vyzvednutí', en: 'Preferred pickup day' },
      access: { update: adminOrStaff },
    },
    {
      // Historic. Every new order is a pickup; `delivery` only remains for rows
      // placed before the farm went pickup-only.
      name: 'deliveryMethod',
      type: 'select',
      required: true,
      defaultValue: 'pickup',
      label: { cs: 'Způsob předání', en: 'Fulfilment' },
      access: { update: adminOnly },
      options: [
        { label: { cs: 'Osobní odběr', en: 'Pickup' }, value: 'pickup' },
        { label: { cs: 'Doručení (historické)', en: 'Delivery (historic)' }, value: 'delivery' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'deliveryAddress',
      type: 'group',
      access: { update: adminOnly },
      admin: {
        condition: (data) => data?.deliveryMethod === 'delivery',
      },
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'zip', type: 'text' },
      ],
    },
    {
      // Cash at pickup is the only way to pay (ADR 0001).
      name: 'paymentMethod',
      type: 'select',
      required: true,
      defaultValue: 'cash',
      label: { cs: 'Platba', en: 'Payment' },
      access: { update: adminOnly },
      options: [{ label: { cs: 'Hotově při převzetí', en: 'Cash at pickup' }, value: 'cash' }],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'unpaid',
      label: { cs: 'Stav platby', en: 'Payment status' },
      access: { update: adminOrStaff },
      options: [
        { label: { cs: 'Nezaplaceno', en: 'Unpaid' }, value: 'unpaid' },
        { label: { cs: 'Zaplaceno', en: 'Paid' }, value: 'paid' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'orderStatus',
      type: 'select',
      defaultValue: 'received',
      label: { cs: 'Stav objednávky', en: 'Order status' },
      access: { update: adminOrStaff },
      options: [
        { label: { cs: 'Přijato', en: 'Received' }, value: 'received' },
        { label: { cs: 'Připravuje se', en: 'Preparing' }, value: 'preparing' },
        { label: { cs: 'Připraveno k vyzvednutí', en: 'Ready for pickup' }, value: 'shipped' },
        { label: { cs: 'Převzato', en: 'Picked up' }, value: 'delivered' },
        { label: { cs: 'Zrušeno', en: 'Cancelled' }, value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'customerNote',
      type: 'textarea',
      label: { cs: 'Poznámka zákazníka', en: 'Customer note' },
      access: { update: adminOnly },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: { cs: 'Interní poznámka', en: 'Internal note' },
      access: { update: adminOrStaff },
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      access: { update: adminOnly },
      options: [
        { label: 'CZ', value: 'cs' },
        { label: 'EN', value: 'en' },
      ],
      defaultValue: 'cs',
      admin: {
        position: 'sidebar',
        description: { cs: 'Jazyk e-mailů o stavu objednávky', en: 'Language of the order status emails' },
      },
    },
  ],
}
