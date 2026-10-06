import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdminOrStaff, publicRead } from '../access'
import { validateBatch, type BatchShape } from '@/lib/batches/transitions'
import { notifyBatchOpened } from '@/lib/batches/notifyOpened'

/**
 * Batch ("turnus") — a period in which one product is available for pickup.
 * Customers book against it before its dates are known; the owner opens it by
 * entering pickup days and a confirmation deadline (see CONTEXT.md).
 */
export const Batches: CollectionConfig = {
  slug: 'batches',
  labels: {
    singular: { cs: 'Turnus', en: 'Batch' },
    plural: { cs: 'Turnusy', en: 'Batches' },
  },
  access: {
    read: publicRead,
    create: isAdminOrStaff,
    update: isAdminOrStaff,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'product', 'status', 'bookedCount', 'capacity', 'confirmationDeadline'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
    description: {
      cs: 'Zákazníci rezervují na plánovaný turnus. Když doplníte dny vyzvednutí a termín potvrzení a přepnete na „Otevřený“, dostanou e-mail a potvrdí si rezervaci.',
      en: 'Customers book against a planned batch. Once you add pickup days and a confirmation deadline and switch to “Open”, they get an email and confirm.',
    },
    components: {
      views: {
        edit: {
          roster: {
            Component: '@/components/admin/RosterView#RosterView',
            path: '/roster',
            tab: {
              label: 'Seznam k výdeji',
              href: '/roster',
              order: 200,
            },
          },
        },
      },
    },
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req, operation }) => {
        if (req.context.skipBatchValidation) return data
        const merged = { ...(originalDoc ?? {}), ...data } as BatchShape & Record<string, unknown>
        const problem = validateBatch(merged, operation === 'update' && originalDoc ? (originalDoc as BatchShape) : null)
        if (problem) throw new APIError(problem, 400)
        if (merged.status === 'open' && (!originalDoc || originalDoc.status !== 'open') && !merged.openedAt) {
          return { ...data, openedAt: new Date().toISOString() }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !previousDoc) return doc
        if (previousDoc.status !== 'open' && doc.status === 'open') {
          try {
            await notifyBatchOpened(req.payload, doc.id, req)
          } catch (e) {
            req.payload.logger.error(`notifyBatchOpened failed for batch ${doc.id}: ${String(e)}`)
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      localized: true,
      required: true,
      label: { cs: 'Název', en: 'Label' },
      admin: { description: { cs: 'Např. „Kuřata – konec srpna 2027“.', en: 'E.g. “Chickens – late August 2027”.' } },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: { cs: 'Produkt', en: 'Product' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'planned',
      index: true,
      label: { cs: 'Stav', en: 'Status' },
      options: [
        { label: { cs: 'Plánovaný (rezervace bez termínu)', en: 'Planned (bookings, no dates yet)' }, value: 'planned' },
        { label: { cs: 'Otevřený (termíny potvrzeny)', en: 'Open (dates confirmed)' }, value: 'open' },
        { label: { cs: 'Uzavřený', en: 'Closed' }, value: 'closed' },
        { label: { cs: 'Proběhl', en: 'Completed' }, value: 'completed' },
        { label: { cs: 'Zrušený', en: 'Cancelled' }, value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'capacity',
          type: 'number',
          required: true,
          min: 1,
          label: { cs: 'Kapacita (ks)', en: 'Capacity (units)' },
        },
        {
          name: 'bookedCount',
          type: 'number',
          defaultValue: 0,
          label: { cs: 'Rezervováno (ks)', en: 'Booked (units)' },
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'confirmationDeadline',
      type: 'date',
      label: { cs: 'Potvrdit do', en: 'Confirm by' },
      admin: {
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd. M. yyyy' },
        description: { cs: 'Do kdy musí zákazníci rezervaci potvrdit. Nepotvrzené se po tomto dni uvolní.', en: 'By when customers must confirm. Unconfirmed bookings are released after this day.' },
      },
    },
    {
      name: 'pickupDays',
      type: 'array',
      label: { cs: 'Dny vyzvednutí', en: 'Pickup days' },
      labels: { singular: { cs: 'Den', en: 'Day' }, plural: { cs: 'Dny', en: 'Days' } },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'date', type: 'date', required: true, label: { cs: 'Datum', en: 'Date' }, admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd. M. yyyy' } } },
            { name: 'pickupPoint', type: 'relationship', relationTo: 'pickup-points', required: true, label: { cs: 'Odběrné místo', en: 'Pickup point' } },
          ],
        },
      ],
    },
    {
      name: 'note',
      type: 'textarea',
      localized: true,
      label: { cs: 'Poznámka pro zákazníky', en: 'Note for customers' },
    },
    {
      name: 'openedAt',
      type: 'date',
      label: { cs: 'Otevřeno', en: 'Opened' },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
