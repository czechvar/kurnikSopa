import type { Access, CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import { isAdminOrEditor } from '../access'
import { publishedPostsWhere } from '@/lib/posts/queries'
import { postPreviewPath } from '@/lib/posts/preview'
import { describePublication } from '@/lib/posts/publication-status'
import { fillPublishedAt } from './hooks/fillPublishedAt'

/**
 * Admins and editors read everything. Everyone else — signed in or not — gets
 * posts that are published and due, so neither a draft nor a scheduled post
 * can be fetched through `/api/posts` ahead of time.
 */
const readPublishedOrEditorial: Access = (args) => {
  if (isAdminOrEditor(args)) return true
  return publishedPostsWhere()
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: { cs: 'Článek', en: 'Post' },
    plural: { cs: 'Články', en: 'Posts' },
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeChange: [fillPublishedAt],
  },
  access: {
    read: readPublishedOrEditorial,
    // Unpublished edits live only in the versions table. Without this, Payload
    // lets any signed-in user read them.
    readVersions: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedAt', '_status'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'editor',
    // The "Náhled" icon left of "Uložit koncept". Shows the last saved version.
    preview: (doc, { locale }) => postPreviewPath(doc, locale),
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { cs: 'Obsah', en: 'Content' },
          fields: [
            {
              name: 'title',
              type: 'text',
              label: { cs: 'Nadpis', en: 'Title' },
              localized: true,
              required: true,
              admin: {
                description: {
                  cs: 'Nadpis článku, jak se zobrazí na webu.',
                  en: 'The post title as it appears on the site.',
                },
              },
            },
            slugField({ sourceField: 'title' }),
            {
              name: 'excerpt',
              type: 'textarea',
              label: { cs: 'Úvodník', en: 'Excerpt' },
              localized: true,
              admin: {
                description: {
                  cs: 'Krátké shrnutí ve 2–3 větách. Zobrazí se v přehledu článků a na úvodní stránce webu.',
                  en: 'A short summary in 2–3 sentences, shown in the post list and on the homepage.',
                },
              },
            },
            {
              name: 'content',
              type: 'richText',
              label: { cs: 'Text článku', en: 'Content' },
              localized: true,
              admin: {
                description: {
                  cs: 'Fotku do textu vložíte tak, že na prázdném řádku napíšete lomítko „/“ a vyberete Nahrát.',
                  en: 'To put a photo in the text, type a slash “/” on an empty line and choose Upload.',
                },
              },
            },
            {
              name: 'coverImage',
              type: 'upload',
              label: { cs: 'Hlavní fotka', en: 'Cover image' },
              relationTo: 'media',
              admin: {
                description: {
                  cs: 'Fotka nahoře v článku a v přehledu článků. Nejlépe vypadá fotka na šířku.',
                  en: 'Shown at the top of the post and in the post list. Landscape photos look best.',
                },
              },
            },
          ],
        },
        {
          label: { cs: 'Zařazení', en: 'Author and categories' },
          fields: [
            {
              name: 'author',
              type: 'relationship',
              label: { cs: 'Autor', en: 'Author' },
              relationTo: 'authors',
              admin: {
                description: {
                  cs: 'Kdo článek napsal. Nového autora přidáte tlačítkem „+“ vedle pole.',
                  en: 'Who wrote the post. Add a new author with the “+” button next to the field.',
                },
              },
            },
            {
              name: 'categories',
              type: 'relationship',
              label: { cs: 'Rubriky', en: 'Categories' },
              relationTo: 'post-categories',
              hasMany: true,
              admin: {
                description: {
                  cs: 'Rubriky, do kterých článek patří. Nepovinné.',
                  en: 'The categories the post belongs to. Optional.',
                },
              },
            },
          ],
        },
        {
          label: { cs: 'SEO', en: 'SEO' },
          fields: [
            {
              name: 'seo',
              type: 'group',
              label: { cs: 'Vyhledávače a sdílení', en: 'Search and sharing' },
              admin: {
                description: {
                  cs: 'Nepovinné. Když pole necháte prázdná, použije se nadpis, úvodník a hlavní fotka článku.',
                  en: 'Optional. Left empty, the title, excerpt and cover image are used.',
                },
              },
              fields: [
                {
                  name: 'metaTitle',
                  type: 'text',
                  label: { cs: 'Titulek pro vyhledávače', en: 'Meta title' },
                  localized: true,
                },
                {
                  name: 'metaDescription',
                  type: 'textarea',
                  label: { cs: 'Popis pro vyhledávače', en: 'Meta description' },
                  localized: true,
                },
                {
                  name: 'metaImage',
                  type: 'upload',
                  label: { cs: 'Obrázek pro sdílení', en: 'Share image' },
                  relationTo: 'media',
                  admin: {
                    description: {
                      cs: 'Obrázek, který se ukáže u odkazu na Facebooku a jinde.',
                      en: 'The image shown with a link on Facebook and elsewhere.',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: { cs: 'Datum zveřejnění', en: 'Publish date' },
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'd. M. yyyy H:mm',
          timeFormat: 'H:mm',
        },
        description: {
          cs: 'Necháte-li prázdné, doplní se samo při publikování. Budoucí datum článek naplánuje: po kliknutí na Publikovat se na webu objeví až v ten den a hodinu.',
          en: 'Left empty, it fills in when you publish. A future date schedules the post: after you click Publish it appears on the site on that day and time.',
        },
      },
    },
    {
      // Payload's status says "Publikováno" for a scheduled post too. This
      // says what visitors actually see. Computed on read, never stored.
      name: 'onSite',
      type: 'textarea',
      virtual: true,
      label: { cs: 'Na webu', en: 'On the site' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        rows: 2,
        description: {
          cs: 'Podle naposledy uložené verze. Obnoví se, když kliknete na Uložit koncept nebo Publikovat.',
          en: 'For the last saved version. It updates when you click Save draft or Publish.',
        },
      },
      hooks: {
        afterRead: [
          ({ siblingData, req }) =>
            describePublication(siblingData, req.i18n?.language === 'en' ? 'en' : 'cs'),
        ],
      },
    },
  ],
}
