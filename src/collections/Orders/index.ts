import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer', 'totalAmount', 'orderStatus', 'paymentStatus'],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
    },
    // Guest checkout fields
    {
      name: 'guestEmail',
      type: 'email',
    },
    {
      name: 'guestName',
      type: 'text',
    },
    {
      name: 'guestPhone',
      type: 'text',
    },
    {
      name: 'items',
      type: 'array',
      required: true,
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
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'deliveryMethod',
      type: 'select',
      required: true,
      options: [
        { label: 'Osobní odběr', value: 'pickup' },
        { label: 'Doručení', value: 'delivery' },
        { label: 'Balíkovna', value: 'balikovna' },
      ],
    },
    {
      name: 'deliveryAddress',
      type: 'group',
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
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
