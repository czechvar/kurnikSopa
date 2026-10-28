import type { Field } from 'payload'

type SlugFieldArgs = {
  sourceField?: string
  required?: boolean
}

export function slugField({ sourceField = 'name', required = true }: SlugFieldArgs = {}): Field {
  return {
    name: 'slug',
    type: 'text',
    label: { cs: 'Adresa na webu', en: 'URL slug' },
    unique: true,
    required,
    admin: {
      position: 'sidebar',
      description: {
        cs: 'Část webové adresy, např. „jarni-kuratka“. Vyplní se sama z názvu. Po zveřejnění ji neměňte, jinak přestanou fungovat odkazy, které už lidé sdílejí.',
        en: 'Part of the web address, e.g. “spring-chicks”. Filled in from the name. Don’t change it once published, or links people have already shared stop working.',
      },
      components: {
        Field: '@/components/admin/SlugField#SlugField',
      },
      custom: {
        sourceField,
      },
    },
  }
}
