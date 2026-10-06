import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations',
  labels: {
    singular: { cs: 'Registrace na akci', en: 'Event Registration' },
    plural: { cs: 'Registrace na akce', en: 'Event Registrations' },
  },
  // Registrations carry guests' names, e-mails and phone numbers. They are
  // entered by an admin today; a public sign-up form would need its own
  // create rule.
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'guestName',
    defaultColumns: ['event', 'guestName', 'numberOfPeople', 'paymentStatus'],
    hidden: ({ user }) => user?.role !== 'admin',
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
    },
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'guestName',
      type: 'text',
    },
    {
      name: 'guestEmail',
      type: 'email',
    },
    {
      name: 'guestPhone',
      type: 'text',
    },
    {
      name: 'numberOfPeople',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'paymentStatus',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Čeká na platbu', value: 'pending' },
        { label: 'Zaplaceno', value: 'paid' },
        { label: 'Zdarma', value: 'free' },
      ],
    },
    {
      name: 'confirmationSent',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
