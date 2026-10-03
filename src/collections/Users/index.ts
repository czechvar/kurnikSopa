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

/**
 * Who may set `role` while a user is being created.
 *
 * Signup is deliberately public, so without this an anonymous POST to
 * /api/users could simply ask for `role: 'admin'` — and the auto-verify hook
 * below would hand back a usable admin account with no email round-trip.
 *
 * The one exception is bootstrapping: Payload's create-first-user screen runs
 * with nobody logged in, so an empty users table has to be allowed to mint the
 * first admin. After that the table is never empty again.
 */
const canSetRoleOnCreate: FieldAccess = async ({ req }) => {
  if (req.user?.role === 'admin') return true
  const { totalDocs } = await req.payload.count({ collection: 'users' })
  return totalDocs === 0
}

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
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Admin, staff and editor users don't go through the customer
        // email-verification flow; without this, the first admin on a fresh
        // deploy gets locked out with _verified=false and no way to bootstrap.
        if (data.role === 'admin' || data.role === 'staff' || data.role === 'editor') {
          return { ...data, _verified: true }
        }
        return data
      },
    ],
  },
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
        { label: 'Editor', value: 'editor' },
        { label: 'Customer', value: 'customer' },
      ],
      required: true,
      access: {
        create: canSetRoleOnCreate,
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
