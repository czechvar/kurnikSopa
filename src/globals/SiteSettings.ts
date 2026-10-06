import type { GlobalConfig } from 'payload'
import { isAdmin } from '../collections/access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  label: { cs: 'Nastavení webu', en: 'Site Settings' },
  admin: {
    hidden: ({ user }) => user?.role !== 'admin',
  },
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
      name: 'notificationEmail',
      type: 'email',
      admin: {
        description: 'Kam chodí upozornění na nové objednávky (např. info@kurniksopa.cz)',
      },
    },
    {
      // Unused since the farm went cash-only (docs/adr/0001-cash-only-at-pickup.md).
      // Kept so a QR code at pickup can be switched on later without a migration.
      name: 'payment',
      type: 'group',
      label: { cs: 'Bankovní účet (nepoužívá se)', en: 'Bank account (unused)' },
      admin: {
        description: {
          cs: 'Web platby nepřijímá — zákazníci platí hotově při převzetí. Tato pole se zatím nikde nezobrazují.',
          en: 'The site takes no payments — customers pay cash at pickup. These fields are not shown anywhere yet.',
        },
      },
      fields: [
        { name: 'bankName', type: 'text' },
        { name: 'accountPrefix', type: 'text' },
        { name: 'accountNumber', type: 'text' },
        { name: 'bankCode', type: 'text' },
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
