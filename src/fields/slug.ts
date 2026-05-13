import type { Field } from 'payload'

type SlugFieldArgs = {
  sourceField?: string
  required?: boolean
}

export function slugField({ sourceField = 'name', required = true }: SlugFieldArgs = {}): Field {
  return {
    name: 'slug',
    type: 'text',
    unique: true,
    required,
    admin: {
      position: 'sidebar',
      components: {
        Field: '@/components/admin/SlugField#SlugField',
      },
      custom: {
        sourceField,
      },
    },
  }
}
