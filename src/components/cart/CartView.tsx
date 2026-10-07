'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/routing'
import { buttonClass } from '@/components/ui/button'
import type { Cart, Product, Media } from '@/payload-types'

type Props = {
  /** Null when a guest has not added anything yet. */
  cart: Cart | null
  locale: 'cs' | 'en'
}

function formatCzk(n: number): string {
  return `${Math.round(n).toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function getProductName(p: Product | number, locale: 'cs' | 'en'): string {
  if (typeof p !== 'object') return '?'
  if (typeof p.name === 'string') return p.name
  return (p.name as Record<string, string>)?.[locale] ?? '?'
}

function getProductImage(p: Product | number): string | null {
  if (typeof p !== 'object' || !p.images || !Array.isArray(p.images) || p.images.length === 0) return null
  const first = p.images[0]
  if (!first || typeof first !== 'object') return null
  const image = (first as { image?: Media | number }).image
  if (!image || typeof image !== 'object') return null
  return image.url ?? null
}

export function CartView({ cart, locale }: Props) {
  const t = useTranslations('cart')
  const router = useRouter()
  const [items, setItems] = useState(cart?.items ?? [])
  const [submitting, startTransition] = useTransition()

  const subtotal = items.reduce((sum, it) => {
    const p = it.product as Product | number
    const price = typeof p === 'object' ? p.price : 0
    return sum + price * it.quantity
  }, 0)

  function persist(nextItems: typeof items) {
    if (!cart) return
    const previous = items
    setItems(nextItems)
    startTransition(async () => {
      const res = await fetch(`/api/carts/${cart.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: nextItems.map(it => ({
            product: typeof it.product === 'object' ? it.product.id : it.product,
            quantity: it.quantity,
          })),
        }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        setItems(previous)
        toast.error(t('errors.generic'))
      }
    })
  }

  function updateQty(idx: number, qty: number) {
    if (qty < 1) return
    const next = items.map((it, i) => i === idx ? { ...it, quantity: qty } : it)
    persist(next)
  }

  function remove(idx: number) {
    persist(items.filter((_, i) => i !== idx))
  }

  if (!cart || items.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-ink">{t('empty.title')}</h2>
        <p className="text-ink-muted">{t('empty.body')}</p>
        <Link href="/produkty" className={buttonClass('primary')}>
          {t('empty.cta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-line">
        {items.map((it, idx) => {
          const p = it.product as Product | number
          const name = getProductName(p, locale)
          const img = getProductImage(p)
          const unitPrice = typeof p === 'object' ? p.price : 0
          const minOrder = typeof p === 'object' ? (p.minimumOrder ?? 1) : 1
          return (
            <li key={idx} className="flex items-center gap-4 py-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-ground-sunken">
                {img && <Image src={img} alt={name} width={80} height={80} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{name}</div>
                <div className="text-sm text-ink-muted">{formatCzk(unitPrice)}{typeof p === 'object' && p.unit ? ` / ${p.unit}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQty(idx, Math.max(minOrder, it.quantity - 1))}
                  disabled={submitting || it.quantity <= minOrder}
                  aria-label={t('lineItem.qty')}
                  className="h-8 w-8 rounded border border-line disabled:opacity-30"
                >−</button>
                <span className="w-8 text-center">{it.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQty(idx, it.quantity + 1)}
                  disabled={submitting}
                  aria-label={t('lineItem.qty')}
                  className="h-8 w-8 rounded border border-line disabled:opacity-30"
                >+</button>
              </div>
              <div className="w-24 text-right font-semibold">{formatCzk(unitPrice * it.quantity)}</div>
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={submitting}
                className="text-sm text-red-700 hover:underline"
              >{t('lineItem.remove')}</button>
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 border-t border-line pt-4">
        <div className="flex justify-between text-sm">
          <span>{t('summary.subtotal')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('summary.shipping')}</span>
          <span>{t('summary.shippingFree')}</span>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold text-ink">
          <span>{t('summary.total')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
      </div>

      <Link href="/pokladna" className={buttonClass('primary', 'md', 'w-full')}>
        {t('cta.checkout')}
      </Link>
    </div>
  )
}
