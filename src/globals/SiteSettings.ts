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
    {
      // The legal pages (terms, privacy, cookies) name the seller from here and
      // from owner/farmName/address/contact above, so the farm edits it once.
      name: 'legal',
      type: 'group',
      label: { cs: 'Údaje prodávajícího pro právní stránky', en: 'Seller details for the legal pages' },
      admin: {
        description: {
          cs: 'Zobrazí se v obchodních podmínkách, v zásadách ochrany osobních údajů a v zásadách cookies. Jméno, adresa, e-mail a telefon se berou z polí výše.',
          en: 'Shown on the terms, privacy and cookie pages. Name, address, email and phone come from the fields above.',
        },
      },
      fields: [
        { name: 'ico', type: 'text', label: { cs: 'IČO', en: 'Company ID (IČO)' } },
        {
          name: 'dic',
          type: 'text',
          label: { cs: 'DIČ', en: 'VAT ID (DIČ)' },
          admin: { description: { cs: 'Jen pokud je prodávající plátce DPH.', en: 'Only if the seller is a VAT payer.' } },
        },
        {
          name: 'registration',
          type: 'text',
          label: { cs: 'Zápis v evidenci', en: 'Registration' },
          admin: {
            description: {
              cs: 'Kde je prodávající evidován, např. „evidence zemědělského podnikatele, Městský úřad …“ nebo „živnostenský rejstřík, Živnostenský úřad …“.',
              en: 'Where the seller is registered, e.g. as an agricultural entrepreneur with the municipal authority.',
            },
          },
        },
        {
          name: 'effectiveFrom',
          type: 'date',
          label: { cs: 'Platné od', en: 'Effective from' },
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd. M. yyyy' },
            description: {
              cs: 'Od kdy platí obchodní podmínky, zásady ochrany osobních údajů a zásady cookies. Při změně jejich textu datum posuňte.',
              en: 'When the terms, privacy and cookie policies take effect. Move it when their text changes.',
            },
          },
        },
      ],
    },
  ],
}
