'use client'

import { useEffect, useRef } from 'react'
import type { TextFieldClientComponent } from 'payload'
import { TextField, useField, useFormFields } from '@payloadcms/ui'
import { slugify } from '@/lib/slugify'

export const SlugField: TextFieldClientComponent = (props) => {
  const sourceFieldPath =
    (props.field.admin?.custom as { sourceField?: string } | undefined)?.sourceField ?? 'name'

  const { value, setValue } = useField<string>({ path: props.path })
  const sourceValue = useFormFields<string | undefined>(
    ([fields]) => fields?.[sourceFieldPath]?.value as string | undefined,
  )

  const lastAutoRef = useRef<string | undefined>(undefined)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const expected = slugify(sourceValue)
    if (!expected) return
    const current = valueRef.current ?? ''
    if (!current || current === lastAutoRef.current || current === expected) {
      if (current !== expected) setValue(expected)
      lastAutoRef.current = expected
    }
  }, [sourceValue, setValue])

  return <TextField {...props} />
}

export default SlugField
