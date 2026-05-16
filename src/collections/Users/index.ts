import type { CollectionConfig, Access, FieldAccess } from 'payload'
import { verifyEmailTemplate, forgotPasswordTemplate } from '@/lib/email/templates'
import { resendVerification } from './endpoints/resendVerification'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return { id: { equals: req.user.id } }
}

const adminFieldOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailSubject: ({ req }) =>
        req.locale === 'en' ? 'Verify your email' : 'Ověřte svůj e-mail',
      generateEmailHTML: ({ req, token, user }) =>
        verifyEmailTemplate({
          locale: (req.locale === 'en' ? 'en' : 'cs'),
          token,
          email: (user as { email: string }).email,
          firstName: (user as { firstName?: string }).firstName,
        }),
    },
    forgotPassword: {
      generateEmailSubject: (args) =>
        args?.req?.locale === 'en' ? 'Reset your password' : 'Obnovení hesla',
      generateEmailHTML: (args) =>
        forgotPasswordTemplate({
          locale: args?.req?.locale === 'en' ? 'en' : 'cs',
          token: args?.token ?? '',
          firstName: (args?.user as { firstName?: string } | undefined)?.firstName,
        }),
    },
  },
  admin: {
    useAsTitle: 'email',
    hidden: ({ user }) => user?.role !== 'admin',
  },
  endpoints: [resendVerification],
  access: {
    create: () => true,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdminOrSelf,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      access: {
        update: adminFieldOnly,
      },
    },
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'lastName',
      type: 'text',
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Staff', value: 'staff' },
        { label: 'Customer', value: 'customer' },
      ],
      required: true,
      access: {
        update: adminFieldOnly,
      },
    },
    {
      name: 'addresses',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'street', type: 'text', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'zip', type: 'text', required: true },
      ],
    },
  ],
}
