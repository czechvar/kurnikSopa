import type { Payload, PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'

export type DrizzleLike = { execute: (query: unknown) => Promise<{ rows?: unknown[] } | unknown[]> }

/**
 * The drizzle handle that belongs to the request's transaction, or the shared
 * one when there is no transaction. Payload keeps open transactions in the
 * adapter's `sessions` map keyed by `req.transactionID`.
 */
export function drizzleFor(payload: Payload, req?: PayloadRequest): DrizzleLike {
  const adapter = payload.db as unknown as {
    drizzle: DrizzleLike
    sessions?: Record<string | number, { db: DrizzleLike }>
  }
  const id = req?.transactionID
  if (id !== undefined && id !== null && adapter.sessions?.[id as string]) return adapter.sessions[id as string]!.db
  return adapter.drizzle
}

/**
 * Serialise a critical section across concurrent transactions with a
 * transaction-scoped advisory lock. Released automatically at commit or
 * rollback. Without a transaction this is a no-op.
 */
export async function lockWithinTransaction(payload: Payload, req: PayloadRequest | undefined, key: string): Promise<void> {
  if (!req?.transactionID) return
  await drizzleFor(payload, req).execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`)
}
