import type { CollectionConfig, Access, FieldAccess } from 'payload'
import { forgotPasswordTemplate } from '@/lib/email/templates'
import { isAdminOrStaff } from '../access'
import { requestAccessEndpoint } from './endpoints/requestAccess'
import { acceptInviteEndpoint } from './endpoints/acceptInvite'
import { refuseInactiveLogin } from './hooks/refuseInactiveLogin'
import { captureInvitationFlag, sendInvitationIfFlagged } from './hooks/invitationFlag'

const isAdmin: Access = ({ req }) => req.user?.role === 'admin'

const isAdminOrStaffOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin' || req.user.role === 'staff') return true
  return { id: { equals: req.user.id } }
}

const isAdminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return { id: { equals: req.user.id } }
}

const adminFieldOnly: FieldAccess = ({ req }) => req.user?.role === 'admin'
const adminOrStaffField: FieldAccess = ({ req }) =>
  req.user?.role === 'admin' || req.user?.role === 'staff'

/**
 * Accounts are created by invitation (ADR 0002): admin and staff create them,
 * and the public access-request endpoint creates them server-side. The one
 * exception is bootstrapping: Payload's create-first-user screen runs with
 * nobody logged in, so an empty users table may mint the first admin.
 */
const canCreateUser: Access = async ({ req }) => {
  if (req.user?.role === 'admin' || req.user?.role === 'staff') return true
  const { totalDocs } = await req.payload.count({ collection: 'users' })
  return totalDocs === 0
}

/** Only admin (or the bootstrap create) may choose a role; staff-created users are customers. */
const canSetRoleOnCreate: FieldAccess = async ({ req }) => {
  if (req.user?.role === 'admin') return true
  if (req.user) return false
  const { totalDocs } = await req.payload.count({ collection: 'users' })
  return totalDocs === 0
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { cs: 'Uživatel', en: 'User' },
    plural: { cs: 'Uživatelé', en: 'Users' },
  },
  auth: {
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
    defaultColumns: ['email', 'firstName', 'lastName', 'phone', 'status', 'role'],
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'staff',
    description: {
      cs: 'Účty vydáváme na pozvání. Žádosti o účet se objeví se stavem „Žádost“; zaškrtněte „Poslat pozvánku“ a uložte.',
      en: 'Accounts are by invitation. Access requests show up as “Requested”; tick “Send invitation” and save.',
    },
  },
  endpoints: [requestAccessEndpoint, acceptInviteEndpoint],
  hooks: {
    beforeChange: [captureInvitationFlag],
    afterChange: [sendInvitationIfFlagged],
    beforeLogin: [refuseInactiveLogin],
  },
  access: {
    create: canCreateUser,
    read: isAdminOrStaffOrSelf,
    update: isAdminOrStaffOrSelf,
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
      label: { cs: 'Jméno', en: 'First name' },
    },
    {
      name: 'lastName',
      type: 'text',
      label: { cs: 'Příjmení', en: 'Last name' },
    },
    {
      name: 'phone',
      type: 'text',
      label: { cs: 'Telefon', en: 'Phone' },
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Staff', value: 'staff' },
        { label: 'Editor', value: 'editor' },
        { label: { cs: 'Zákazník', en: 'Customer' }, value: 'customer' },
      ],
      required: true,
      access: {
        create: canSetRoleOnCreate,
        update: adminFieldOnly,
      },
      admin: { position: 'sidebar' },
    },
    {
      // Where the person is on the way to an account. Admin and staff edit it
      // (blocking is just setting `blocked`); customers never see it.
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      index: true,
      label: { cs: 'Stav účtu', en: 'Account status' },
      options: [
        { label: { cs: 'Žádost', en: 'Requested' }, value: 'requested' },
        { label: { cs: 'Pozván', en: 'Invited' }, value: 'invited' },
        { label: { cs: 'Aktivní', en: 'Active' }, value: 'active' },
        { label: { cs: 'Blokován', en: 'Blocked' }, value: 'blocked' },
      ],
      access: { create: adminOrStaffField, update: adminOrStaffField },
      admin: {
        position: 'sidebar',
        description: {
          cs: 'Blokovaný uživatel se nepřihlásí ani neobjedná; jeho objednávky zůstávají.',
          en: 'A blocked user cannot log in or order; their orders stay.',
        },
      },
    },
    {
      // Ticking this and saving sends (or resends) the invitation email. The
      // flag never persists as true — the hook resets it after sending.
      name: 'sendInvitation',
      type: 'checkbox',
      defaultValue: false,
      label: { cs: 'Poslat pozvánku', en: 'Send invitation' },
      access: { create: adminOrStaffField, update: adminOrStaffField },
      admin: {
        position: 'sidebar',
        description: {
          cs: 'Zaškrtněte a uložte. Člověk dostane e-mail s odkazem, kde si nastaví heslo (platí 7 dní). Funguje i pro opakované poslání.',
          en: 'Tick and save. The person gets an email with a link to set their password (valid 7 days). Works for resending too.',
        },
      },
    },
    {
      name: 'requestMessage',
      type: 'textarea',
      label: { cs: 'Vzkaz ze žádosti', en: 'Message from the access request' },
      access: { update: adminOrStaffField },
      admin: { readOnly: true, condition: (data) => Boolean(data?.requestMessage) },
    },
    {
      type: 'row',
      admin: { condition: (data) => Boolean(data?.invitedAt) },
      fields: [
        {
          name: 'invitedAt',
          type: 'date',
          label: { cs: 'Pozvánka odeslána', en: 'Invitation sent' },
          access: { update: adminOrStaffField },
          admin: { readOnly: true },
        },
        {
          name: 'invitedBy',
          type: 'relationship',
          relationTo: 'users',
          label: { cs: 'Pozval(a)', en: 'Invited by' },
          access: { update: adminOrStaffField },
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'addresses',
      type: 'array',
      label: { cs: 'Adresy', en: 'Addresses' },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'street', type: 'text', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'zip', type: 'text', required: true },
      ],
    },
    {
      // The person's orders, shown on their admin page. Payload renders a join
      // field as a table, so this needs no custom component.
      name: 'orders',
      type: 'join',
      collection: 'orders',
      on: 'customer',
      label: { cs: 'Objednávky', en: 'Orders' },
      admin: { defaultColumns: ['orderNumber', 'createdAt', 'totalAmount', 'orderStatus', 'paymentStatus'] },
      access: { read: adminOrStaffField },
    },
  ],
}

export { isAdminOrStaff }
