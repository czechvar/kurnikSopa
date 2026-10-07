import type { DocumentViewServerProps } from 'payload'
import type { Batch, Order, PickupPoint, Product, User } from '@/payload-types'
import { RosterRows, type RosterRow } from './RosterRows'

const dayLabel = (iso: string | null | undefined): string => {
  if (!iso) return 'Bez termínu'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const fmtCzk = (n: number | null | undefined): string => (typeof n === 'number' ? `${Math.round(n).toLocaleString('cs-CZ')} Kč` : '—')

/**
 * The Roster (glossary): the per-Batch list Staff use on pickup day. Grouped
 * by pickup day and Pickup Point; each row takes the real weight, the final
 * price and the cash, and a tick for "picked up and paid". Prints on A4.
 */
export async function RosterView(props: DocumentViewServerProps) {
  const { initPageResult } = props
  const payload = initPageResult.req.payload
  const id = Number(initPageResult.docID)
  if (!Number.isFinite(id)) return <div style={{ padding: 24 }}>Turnus nenalezen.</div>

  const batch = (await payload.findByID({ collection: 'batches', id, depth: 1, locale: 'cs' })) as Batch
  const product = batch.product && typeof batch.product === 'object' ? (batch.product as Product) : null
  const orders = await payload.find({
    collection: 'orders',
    where: { batch: { equals: id } },
    depth: 1,
    limit: 500,
    sort: 'pickupDay',
    locale: 'cs',
  })

  const rows: RosterRow[] = (orders.docs as Order[]).map(o => {
    const customer = o.customer && typeof o.customer === 'object' ? (o.customer as User) : null
    const point = o.pickupPoint && typeof o.pickupPoint === 'object' ? (o.pickupPoint as PickupPoint) : null
    const line = o.items?.[0]
    return {
      id: o.id,
      orderNumber: String(o.orderNumber ?? ''),
      name: customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email : (o.guestName ?? '—'),
      phone: customer?.phone ?? o.guestPhone ?? '',
      email: customer?.email ?? o.guestEmail ?? '',
      quantity: line?.quantity ?? 0,
      pricePerKg: line?.priceAtPurchase ?? product?.price ?? 0,
      estimatedTotal: o.totalAmount,
      actualWeight: line?.actualWeight ?? null,
      finalAmount: o.finalAmount ?? line?.actualTotal ?? null,
      cashTaken: o.cashTaken ?? null,
      orderStatus: o.orderStatus ?? 'confirmed',
      paymentStatus: o.paymentStatus ?? 'unpaid',
      note: o.customerNote ?? null,
      pickupDay: o.pickupDay ?? null,
      pickupPointName: point?.name ?? '',
      items: (o.items ?? []).map(it => ({
        id: it.id ?? null,
        product: typeof it.product === 'object' ? it.product.id : it.product,
        quantity: it.quantity,
        priceAtPurchase: it.priceAtPurchase ?? null,
        actualWeight: it.actualWeight ?? null,
        actualTotal: it.actualTotal ?? null,
      })),
    }
  })

  const active = rows.filter(r => r.orderStatus === 'confirmed' || r.orderStatus === 'ready' || r.orderStatus === 'picked_up')
  const waiting = rows.filter(r => r.orderStatus === 'booked')
  const dropped = rows.filter(r => r.orderStatus === 'released' || r.orderStatus === 'cancelled')

  const groups = new Map<string, { title: string; rows: RosterRow[] }>()
  for (const r of active) {
    const key = `${r.pickupDay ?? ''}|${r.pickupPointName}`
    if (!groups.has(key)) groups.set(key, { title: `${dayLabel(r.pickupDay)}${r.pickupPointName ? ` · ${r.pickupPointName}` : ''}`, rows: [] })
    groups.get(key)!.rows.push(r)
  }

  const totalUnits = active.reduce((s, r) => s + r.quantity, 0)
  const totalKg = active.reduce((s, r) => s + (r.actualWeight ?? 0), 0)
  const totalCash = active.reduce((s, r) => s + (r.cashTaken ?? 0), 0)

  return (
    <div className="roster" style={{ padding: '24px 32px', maxWidth: 1100 }}>
      <style>{`
        .roster h1 { font-size: 1.5rem; margin: 0 0 4px; }
        .roster .meta { color: var(--theme-elevation-600, #6b7280); margin-bottom: 24px; }
        .roster h2 { font-size: 1.1rem; margin: 28px 0 8px; break-after: avoid; }
        .roster table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .roster th, .roster td { padding: 6px 8px; border-bottom: 1px solid var(--theme-elevation-150, #e5e7eb); text-align: left; vertical-align: middle; }
        .roster th { font-weight: 600; color: var(--theme-elevation-700, #374151); }
        .roster td.num, .roster th.num { text-align: right; }
        .roster input[type=number] { width: 6.5em; padding: 4px 6px; border: 1px solid var(--theme-elevation-300, #d1d5db); border-radius: 4px; background: var(--theme-input-bg, #fff); color: inherit; }
        .roster .done td { opacity: 0.6; }
        .roster tfoot td { font-weight: 600; }
        .roster .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
        .roster .toolbar button { padding: 6px 12px; border: 1px solid var(--theme-elevation-400, #9ca3af); border-radius: 4px; background: transparent; color: inherit; cursor: pointer; }
        .roster .status { font-size: 0.8rem; color: var(--theme-elevation-600, #6b7280); }
        @media print {
          body * { visibility: hidden; }
          .roster, .roster * { visibility: visible; }
          .roster { position: absolute; left: 0; top: 0; width: 100%; padding: 12mm; color: #000; }
          .roster .toolbar, .roster .no-print { display: none !important; }
          .roster h2 { break-before: page; }
          .roster h2:first-of-type { break-before: auto; }
          .roster input[type=number] { border: 1px solid #000; background: #fff; color: #000; -webkit-appearance: none; appearance: none; }
          .roster input[type=number]::-webkit-inner-spin-button { display: none; }
          .roster input[type=checkbox] { width: 14px; height: 14px; }
        }
      `}</style>
      <h1>Seznam k výdeji — {batch.label}</h1>
      <p className="meta">
        {product?.name ?? ''} · {product ? `${fmtCzk(product.price)}/${product.unit ?? 'kg'}` : ''} · rezervováno {batch.bookedCount ?? 0} z {batch.capacity} ks
        {batch.confirmationDeadline ? ` · potvrzení do ${dayLabel(batch.confirmationDeadline)}` : ''}
      </p>

      <RosterRows groups={[...groups.values()]} waiting={waiting} dropped={dropped} totals={{ units: totalUnits, kg: totalKg, cash: totalCash }} />
    </div>
  )
}
