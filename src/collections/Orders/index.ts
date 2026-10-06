import type { CollectionConfig, Access, FieldAccess, Where } from 'payload'
import { placeOrderEndpoint } from './endpoints/placeOrder'
import { bookEndpoint } from './endpoints/book'
import { confirmEndpoint, cancelEndpoint } from './endpoints/confirm'
import { sendStatusEmails } from './hooks/sendStatusEmails'
import { applyBatchRules, prepareOrder, syncBookedCount } from './hooks/batchOrders'

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
    // Customers never create orders directly; they go through /api/orders/place
    // or /api/orders/book, which snapshot prices server-side. Staff enter
    // phone orders here.
    create: isAdminOrStaff,
    read: isAdminOrStaffOrOrderOwner,
    update: isAdminOrStaff,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'customer', 'guestName', 'batch', 'pickupDay', 'pickupPoint', 'totalAmount', 'orderStatus', 'paymentStatus'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
    description: {
      cs: 'Telefonickou objednávku zadejte zde: vyberte turnus nebo produkt, počet kusů a vyplňte jméno a telefon, pokud zákazník nemá účet. Číslo objednávky a ceny se doplní samy.',
      en: 'Enter phone orders here: pick a batch or product, the quantity, and the name and phone if the customer has no account. Order number and prices fill in by themselves.',
    },
  },
  endpoints: [placeOrderEndpoint, bookEndpoint, confirmEndpoint, cancelEndpoint],
  hooks: {
    beforeValidate: [prepareOrder],
    beforeChange: [applyBatchRules],
    afterChange: [syncBookedCount, sendStatusEmails],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      unique: true,
      label: { cs: 'Číslo objednávky', en: 'Order number' },
      access: { update: adminOnly },
      admin: { readOnly: true, position: 'sidebar' },
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
        { name: 'guestName', type: 'text', label: { cs: 'Jméno a příjmení', en: 'Full name' }, access: { update: adminOrStaff } },
        { name: 'guestPhone', type: 'text', label: { cs: 'Telefon', en: 'Phone' }, access: { update: adminOrStaff } },
        { name: 'guestEmail', type: 'email', label: { cs: 'E-mail', en: 'Email' }, access: { update: adminOrStaff } },
      ],
    },
    {
      name: 'accessToken',
      type: 'text',
      index: true,
      access: { read: adminOrStaff, update: adminOnly },
      admin: { hidden: true, readOnly: true },
    },
    {
      // Set for bookings (glossary: Booking). A buy-now order has no batch.
      name: 'batch',
      type: 'relationship',
      relationTo: 'batches',
      index: true,
      label: { cs: 'Turnus', en: 'Batch' },
      access: { update: adminOnly },
      admin: { position: 'sidebar', description: { cs: 'Vyplňte u rezervací. Objednávka pak drží kusy z kapacity turnusu.', en: 'Set for bookings. The order then holds units of the batch capacity.' } },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      label: { cs: 'Položky', en: 'Items' },
      access: { update: adminOrStaff },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'product', type: 'relationship', relationTo: 'products', required: true, access: { update: adminOnly } },
            { name: 'quantity', type: 'number', required: true, min: 1, label: { cs: 'Počet (ks)', en: 'Quantity' }, access: { update: adminOnly } },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'priceAtPurchase',
              type: 'number',
              label: { cs: 'Cena (snapshot)', en: 'Price (snapshot)' },
              access: { update: adminOnly },
              admin: { description: { cs: 'Doplní se z produktu, když zůstane prázdné.', en: 'Filled from the product when left empty.' } },
            },
            {
              name: 'estimatedTotal',
              type: 'number',
              label: { cs: 'Odhad (Kč)', en: 'Estimate (CZK)' },
              access: { update: adminOnly },
              admin: { readOnly: true },
            },
            {
              name: 'actualWeight',
              type: 'number',
              min: 0,
              label: { cs: 'Skutečná váha (kg)', en: 'Actual weight (kg)' },
              access: { update: adminOrStaff },
            },
            {
              name: 'actualTotal',
              type: 'number',
              min: 0,
              label: { cs: 'Konečná cena (Kč)', en: 'Final price (CZK)' },
              access: { update: adminOrStaff },
            },
          ],
        },
      ],
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: { cs: 'Celkem / odhad (Kč)', en: 'Total / estimate (CZK)' },
      access: { update: adminOnly },
      admin: { position: 'sidebar', description: { cs: 'U rezervací odhad podle průměrné váhy.', en: 'For bookings an estimate from the average weight.' } },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'finalAmount',
          type: 'number',
          min: 0,
          label: { cs: 'Konečná částka (Kč)', en: 'Final amount (CZK)' },
          access: { update: adminOrStaff },
        },
        {
          name: 'cashTaken',
          type: 'number',
          min: 0,
          label: { cs: 'Hotovost přijata (Kč)', en: 'Cash taken (CZK)' },
          access: { update: adminOrStaff },
        },
      ],
    },
    {
      name: 'pickupPoint',
      type: 'relationship',
      relationTo: 'pickup-points',
      label: { cs: 'Odběrné místo', en: 'Pickup point' },
      access: { update: adminOrStaff },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'pickupDay',
          type: 'date',
          label: { cs: 'Den vyzvednutí (turnus)', en: 'Pickup day (batch)' },
          access: { update: adminOrStaff },
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd. M. yyyy' } },
        },
        {
          name: 'preferredDate',
          type: 'date',
          label: { cs: 'Preferovaný den (běžný nákup)', en: 'Preferred day (buy now)' },
          access: { update: adminOrStaff },
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd. M. yyyy' } },
        },
      ],
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
      admin: { condition: (data) => data?.deliveryMethod === 'delivery' },
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
      // booked → confirmed → ready → picked_up; released when a booking was
      // never confirmed by the deadline; cancelled anywhere. Buy-now orders
      // start at confirmed.
      name: 'orderStatus',
      type: 'select',
      defaultValue: 'confirmed',
      index: true,
      label: { cs: 'Stav objednávky', en: 'Order status' },
      access: { update: adminOrStaff },
      options: [
        { label: { cs: 'Rezervováno (čeká na termíny)', en: 'Booked (awaiting dates)' }, value: 'booked' },
        { label: { cs: 'Potvrzeno', en: 'Confirmed' }, value: 'confirmed' },
        { label: { cs: 'Připraveno k vyzvednutí', en: 'Ready for pickup' }, value: 'ready' },
        { label: { cs: 'Převzato', en: 'Picked up' }, value: 'picked_up' },
        { label: { cs: 'Uvolněno (nepotvrzeno)', en: 'Released (not confirmed)' }, value: 'released' },
        { label: { cs: 'Zrušeno', en: 'Cancelled' }, value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      admin: { condition: (data) => Boolean(data?.batch) },
      fields: [
        { name: 'confirmedAt', type: 'date', label: { cs: 'Potvrzeno', en: 'Confirmed at' }, access: { update: adminOrStaff }, admin: { readOnly: true } },
        { name: 'releasedAt', type: 'date', label: { cs: 'Uvolněno', en: 'Released at' }, access: { update: adminOrStaff }, admin: { readOnly: true } },
        { name: 'reminderSentAt', type: 'date', label: { cs: 'Připomínka odeslána', en: 'Reminder sent' }, access: { update: adminOrStaff }, admin: { readOnly: true } },
      ],
    },
    {
      name: 'pickedUpAt',
      type: 'date',
      label: { cs: 'Převzato dne', en: 'Picked up at' },
      access: { update: adminOrStaff },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'customerNote',
      type: 'textarea',
      label: { cs: 'Poznámka zákazníka', en: 'Customer note' },
      access: { update: adminOrStaff },
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
