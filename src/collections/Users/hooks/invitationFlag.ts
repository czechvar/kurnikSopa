import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import { sendInvitation } from '@/lib/users/invitations'

const CONTEXT_KEY = 'sendInvitation'

/**
 * The admin "Send invitation" checkbox is an action, not data: remember the
 * intent on the request and never store the flag as true.
 */
export const captureInvitationFlag: CollectionBeforeChangeHook = ({ data, req }) => {
  if (data?.sendInvitation === true) {
    req.context[CONTEXT_KEY] = true
    return { ...data, sendInvitation: false }
  }
  return data
}

export const sendInvitationIfFlagged: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (req.context[CONTEXT_KEY] !== true) return doc
  delete req.context[CONTEXT_KEY]
  try {
    await sendInvitation(
      req.payload,
      { userId: doc.id, invitedBy: req.user?.id ?? null, locale: req.locale === 'en' ? 'en' : 'cs' },
      req,
    )
  } catch (e) {
    req.payload.logger.error(`Invitation for user ${doc.id} failed: ${String(e)}`)
  }
  return doc
}
