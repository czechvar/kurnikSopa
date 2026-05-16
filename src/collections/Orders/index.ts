import type { CollectionConfig, Access, FieldAccess } from 'payload'
import { placeOrderEndpoint } from './endpoints/placeOrder'
import { sendStatusEmails } from './hooks/sendStatusEmails'

const adminOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'
const adminOrStaff: FieldAccess = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

const isAdminOrStaffOrOrderOwner: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin' || req.user.role === 'staff') return true
  return {
    or: [
      { customer: { equals: req.user.id } },
      { guestEmail: { equals: req.user.email } },
    ],
  }
}

const isAdminOrStaff: Access = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

export const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    create: ({ req }) => Boolean(req.user),
    read: isAdminOrStaffOrOrderOwner,
    update: isAdminOrStaff,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer', 'totalAmount', 'orderStatus', 'paymentStatus'],
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
      access: { update: adminOnly },
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      access: { update: adminOnly },
    },
    // Guest checkout fields
    {
      name: 'guestEmail',
      type: 'email',
      access: { update: adminOnly },
    },
    {
      name: 'guestName',
      type: 'text',
      access: { update: adminOnly },
    },
    {
      name: 'guestPhone',
      type: 'text',
      access: { update: adminOnly },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
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
            description: 'Cena v době nákupu (snapshot)',
          },
        },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      access: { update: adminOnly },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'deliveryMethod',
      type: 'select',
      required: true,
      access: { update: adminOnly },
      options: [
        { label: 'Osobní odběr', value: 'pickup' },
        { label: 'Doručení', value: 'delivery' },
        { label: 'Balíkovna', value: 'balikovna' },
      ],
    },
    {
      name: 'deliveryAddress',
      type: 'group',
      access: { update: adminOnly },
      admin: {
        condition: (data) => data.deliveryMethod !== 'pickup',
      },
      fields: [
        { name: 'street', type: 'text' },
        { name: 'city', type: 'text' },
        { name: 'zip', type: 'text' },
      ],
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      access: { update: adminOnly },
      options: [
        { label: 'Kartou (Stripe)', value: 'stripe' },
        { label: 'Bankovní převod', value: 'bank_transfer' },
        { label: 'Dobírka', value: 'cash_on_delivery' },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'pending',
      access: { update: adminOrStaff },
      options: [
        { label: 'Čeká na platbu', value: 'pending' },
        { label: 'Zaplaceno', value: 'paid' },
        { label: 'Selhalo', value: 'failed' },
        { label: 'Vráceno', value: 'refunded' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'orderStatus',
      type: 'select',
      defaultValue: 'received',
      access: { update: adminOrStaff },
      options: [
        { label: 'Přijato', value: 'received' },
        { label: 'Připravuje se', value: 'preparing' },
        { label: 'Odesláno', value: 'shipped' },
        { label: 'Doručeno', value: 'delivered' },
        { label: 'Zrušeno', value: 'cancelled' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stripePaymentIntentID',
      type: 'text',
      access: { update: adminOnly },
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'preferredDate',
      type: 'date',
      access: { update: adminOnly },
      admin: { description: 'Preferované datum doručení / odběru' },
    },
    {
      name: 'customerNote',
      type: 'textarea',
      access: { update: adminOnly },
      admin: { description: 'Poznámka zákazníka (čas, dietní preference apod.)' },
    },
    {
      name: 'notes',
      type: 'textarea',
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
        description: 'Lokalizace použitá pro e-maily o stavu objednávky',
      },
    },
    {
      name: 'qrSpayd',
      type: 'text',
      access: { update: adminOnly },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Uložený SPAYD řetězec pro forenzní účely / re-render',
      },
    },
  ],
}
