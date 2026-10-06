import type { CollectionConfig } from 'payload'
import { isAdmin, publicRead } from '../access'

/**
 * Pickup Point — a place where Customers collect their Orders: the farm
 * itself or another location the owner designates (see CONTEXT.md).
 *
 * Exactly one point is flagged `isFarm`; it is listed first in checkout.
 */
export const PickupPoints: CollectionConfig = {
  slug: 'pickup-points',
  labels: {
    singular: { cs: 'Odběrné místo', en: 'Pickup point' },
    plural: { cs: 'Odběrná místa', en: 'Pickup points' },
  },
  access: {
    read: publicRead,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'city', 'isFarm', 'active'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
    description: {
      cs: 'Kde si zákazníci vyzvedávají objednávky. Farma je vždy první; další místa přidejte podle potřeby.',
      en: 'Where customers collect their orders. The farm is always listed first; add other places as needed.',
    },
  },
  hooks: {
    afterChange: [
      // Only one point may be the farm. Flagging a new one unflags the rest.
      async ({ doc, req, operation }) => {
        if (!doc.isFarm) return doc
        if (operation !== 'create' && operation !== 'update') return doc
        const others = await req.payload.find({
          collection: 'pickup-points',
          where: { and: [{ isFarm: { equals: true } }, { id: { not_equals: doc.id } }] },
          depth: 0,
          limit: 50,
          req,
        })
        for (const other of others.docs) {
          await req.payload.update({
            collection: 'pickup-points',
            id: other.id,
            data: { isFarm: false },
            depth: 0,
            req,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      localized: true,
      required: true,
      label: { cs: 'Název', en: 'Name' },
      admin: { description: { cs: 'Např. „Farma Křepice“ nebo „Trh Hustopeče“.', en: 'E.g. “Křepice farm” or “Hustopeče market”.' } },
    },
    {
      type: 'row',
      fields: [
        { name: 'street', type: 'text', required: true, label: { cs: 'Ulice a č.p.', en: 'Street and number' } },
        { name: 'city', type: 'text', required: true, label: { cs: 'Město / obec', en: 'City' } },
        { name: 'zip', type: 'text', required: true, label: { cs: 'PSČ', en: 'ZIP' } },
      ],
    },
    {
      name: 'note',
      type: 'textarea',
      localized: true,
      label: { cs: 'Poznámka pro zákazníky', en: 'Note for customers' },
      admin: { description: { cs: 'Kdy a jak vyzvednout, např. „soboty 9–11, zavolejte předem“.', en: 'When and how to collect, e.g. “Saturdays 9–11, call ahead”.' } },
    },
    {
      name: 'isFarm',
      type: 'checkbox',
      defaultValue: false,
      label: { cs: 'Toto je farma', en: 'This is the farm' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: { cs: 'Aktivní', en: 'Active' },
      admin: { position: 'sidebar', description: { cs: 'Neaktivní místa se v pokladně nenabízejí.', en: 'Inactive points are not offered at checkout.' } },
    },
  ],
}
