import type { CollectionConfig } from 'payload'

export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations',
  admin: {
    useAsTitle: 'guestName',
    defaultColumns: ['event', 'guestName', 'numberOfPeople', 'paymentStatus'],
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
