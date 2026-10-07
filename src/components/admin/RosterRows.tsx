'use client'

import { useState, useTransition } from 'react'

export type RosterRow = {
  id: number
  orderNumber: string
  name: string
  phone: string
  email: string
  quantity: number
  pricePerKg: number
  estimatedTotal: number
  actualWeight: number | null
  finalAmount: number | null
  cashTaken: number | null
  orderStatus: string
  paymentStatus: string
  note: string | null
  pickupDay: string | null
  pickupPointName: string
  items: Array<{ id: string | null; product: number; quantity: number; priceAtPurchase: number | null; actualWeight: number | null; actualTotal: number | null }>
}

type Props = {
  groups: Array<{ title: string; rows: RosterRow[] }>
  waiting: RosterRow[]
  dropped: RosterRow[]
  totals: { units: number; kg: number; cash: number }
}

const fmtCzk = (n: number | null | undefined): string => (typeof n === 'number' ? `${Math.round(n).toLocaleString('cs-CZ')} Kč` : '—')

/** The editable rows of the Roster; each row saves itself with one PATCH. */
export function RosterRows({ groups, waiting, dropped, totals }: Props) {
  const [rows, setRows] = useState<Record<number, RosterRow>>(() =>
    Object.fromEntries([...groups.flatMap(g => g.rows), ...waiting, ...dropped].map(r => [r.id, r])),
  )
  const [saving, setSaving] = useState<Record<number, 'saving' | 'saved' | 'error' | undefined>>({})
  const [, start] = useTransition()

  function setField(id: number, patch: Partial<RosterRow>) {
    setRows(prev => {
      const row = { ...prev[id]!, ...patch }
      if (patch.actualWeight !== undefined && patch.finalAmount === undefined) {
        row.finalAmount = patch.actualWeight === null ? null : Math.round(patch.actualWeight * row.pricePerKg)
      }
      return { ...prev, [id]: row }
    })
  }

  function save(id: number, pickedUp: boolean) {
    const row = rows[id]!
    setSaving(s => ({ ...s, [id]: 'saving' }))
    start(async () => {
      const items = row.items.map((it, i) => ({
        id: it.id ?? undefined,
        product: it.product,
        quantity: it.quantity,
        priceAtPurchase: it.priceAtPurchase ?? undefined,
        actualWeight: i === 0 ? row.actualWeight ?? undefined : it.actualWeight ?? undefined,
        actualTotal: i === 0 ? row.finalAmount ?? undefined : it.actualTotal ?? undefined,
      }))
      const body: Record<string, unknown> = {
        items,
        finalAmount: row.finalAmount ?? undefined,
        cashTaken: pickedUp ? row.cashTaken ?? row.finalAmount ?? undefined : row.cashTaken ?? undefined,
      }
      if (pickedUp) {
        body.orderStatus = 'picked_up'
        body.paymentStatus = 'paid'
      } else if (row.orderStatus === 'picked_up') {
        body.orderStatus = 'ready'
        body.paymentStatus = 'unpaid'
      }
      try {
        const res = await fetch(`/api/orders/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(String(res.status))
        setRows(prev => ({
          ...prev,
          [id]: { ...prev[id]!, orderStatus: pickedUp ? 'picked_up' : prev[id]!.orderStatus === 'picked_up' ? 'ready' : prev[id]!.orderStatus, paymentStatus: pickedUp ? 'paid' : prev[id]!.paymentStatus, cashTaken: (body.cashTaken as number | undefined) ?? prev[id]!.cashTaken },
        }))
        setSaving(s => ({ ...s, [id]: 'saved' }))
      } catch {
        setSaving(s => ({ ...s, [id]: 'error' }))
      }
    })
  }

  const table = (list: RosterRow[], editable: boolean) => (
    <table>
      <thead>
        <tr>
          <th>Číslo</th>
          <th>Zákazník</th>
          <th>Telefon</th>
          <th className="num">Ks</th>
          <th className="num">Odhad</th>
          <th className="num">Váha (kg)</th>
          <th className="num">Cena (Kč)</th>
          <th className="num">Hotovost (Kč)</th>
          <th>Převzato</th>
          <th className="no-print">Uložení</th>
        </tr>
      </thead>
      <tbody>
        {list.map(r0 => {
          const r = rows[r0.id]!
          const done = r.orderStatus === 'picked_up'
          return (
            <tr key={r.id} className={done ? 'done' : ''}>
              <td>{r.orderNumber}</td>
              <td>
                {r.name}
                {r.note && <div className="status">{r.note}</div>}
              </td>
              <td>{r.phone}</td>
              <td className="num">{r.quantity}</td>
              <td className="num">{fmtCzk(r.estimatedTotal)}</td>
              <td className="num">
                {editable ? (
                  <input type="number" step="0.1" min="0" value={r.actualWeight ?? ''} onChange={e => setField(r.id, { actualWeight: e.target.value === '' ? null : Number(e.target.value) })} onBlur={() => save(r.id, done)} />
                ) : (r.actualWeight ?? '—')}
              </td>
              <td className="num">
                {editable ? (
                  <input type="number" step="1" min="0" value={r.finalAmount ?? ''} onChange={e => setField(r.id, { finalAmount: e.target.value === '' ? null : Number(e.target.value) })} onBlur={() => save(r.id, done)} />
                ) : fmtCzk(r.finalAmount)}
              </td>
              <td className="num">
                {editable ? (
                  <input type="number" step="1" min="0" value={r.cashTaken ?? ''} onChange={e => setField(r.id, { cashTaken: e.target.value === '' ? null : Number(e.target.value) })} onBlur={() => save(r.id, done)} />
                ) : fmtCzk(r.cashTaken)}
              </td>
              <td>
                {editable ? (
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={done} onChange={e => save(r.id, e.target.checked)} />
                    <span className="no-print">{done ? 'ano' : 'ne'}</span>
                  </label>
                ) : (r.orderStatus === 'released' ? 'uvolněno' : r.orderStatus === 'cancelled' ? 'zrušeno' : 'čeká na potvrzení')}
              </td>
              <td className="no-print status">{saving[r.id] === 'saving' ? 'ukládám…' : saving[r.id] === 'saved' ? 'uloženo' : saving[r.id] === 'error' ? 'chyba, zkuste znovu' : ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <>
      <div className="toolbar no-print">
        <button type="button" onClick={() => window.print()}>Tisknout</button>
        <span className="status">Váhu, cenu a hotovost uložíte opuštěním políčka; „Převzato“ označí objednávku jako převzatou a zaplacenou.</span>
      </div>
      {groups.length === 0 && <p className="status">Zatím žádné potvrzené objednávky.</p>}
      {groups.map(g => (
        <section key={g.title}>
          <h2>{g.title}</h2>
          {table(g.rows, true)}
        </section>
      ))}
      <table style={{ marginTop: 16 }}>
        <tfoot>
          <tr>
            <td>Celkem potvrzeno</td>
            <td className="num">{totals.units} ks</td>
            <td className="num">{totals.kg.toLocaleString('cs-CZ')} kg</td>
            <td className="num">{fmtCzk(totals.cash)}</td>
          </tr>
        </tfoot>
      </table>
      {waiting.length > 0 && (
        <section className="no-print">
          <h2>Nepotvrzené rezervace ({waiting.length})</h2>
          {table(waiting, false)}
        </section>
      )}
      {dropped.length > 0 && (
        <section className="no-print">
          <h2>Uvolněné a zrušené ({dropped.length})</h2>
          {table(dropped, false)}
        </section>
      )}
    </>
  )
}
