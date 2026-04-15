import type { CollectionConfig } from 'payload'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'eventType', 'date', 'status'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Workshop', value: 'workshop' },
        { label: 'Konference', value: 'conference' },
        { label: 'Sezónní akce', value: 'seasonal' },
        { label: 'Jiné', value: 'other' },
      ],
    },
    {
      name: 'date',
      type: 'date',
      required: true,
    },
    {
      name: 'startTime',
      type: 'text',
      admin: {
        description: 'Např. "10:00"',
      },
    },
    {
      name: 'endTime',
      type: 'text',
    },
    {
      name: 'location',
      type: 'text',
      localized: true,
      admin: {
        description: 'Místo konání na farmě',
      },
    },
    {
      name: 'price',
      type: 'number',
      min: 0,
      admin: {
        description: '0 = zdarma',
      },
    },
    {
      name: 'capacity',
      type: 'number',
    },
    {
      name: 'registeredCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'registrationDeadline',
      type: 'date',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'upcoming',
      options: [
        { label: 'Nadcházející', value: 'upcoming' },
        { label: 'Obsazeno', value: 'full' },
        { label: 'Zrušeno', value: 'cancelled' },
        { label: 'Proběhlo', value: 'past' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
