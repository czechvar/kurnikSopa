import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Nastavení webu',
  fields: [
    {
      name: 'farmName',
      type: 'text',
      defaultValue: 'Kurník & Šopa',
      required: true,
    },
    {
      name: 'tagline',
      type: 'text',
      localized: true,
      defaultValue: 'Regenerativní farma',
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text', defaultValue: '774801667' },
        { name: 'whatsapp', type: 'text' },
      ],
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text', defaultValue: 'Č.p. 313' },
        { name: 'city', type: 'text', defaultValue: 'Křepice u Hustopečí' },
        { name: 'zip', type: 'text', defaultValue: '691 65' },
      ],
    },
    {
      name: 'openingHours',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'social',
      type: 'group',
      fields: [
        { name: 'facebook', type: 'text' },
        { name: 'instagram', type: 'text' },
      ],
    },
    {
      name: 'owner',
      type: 'text',
      defaultValue: 'Antonín Wies',
    },
  ],
}
