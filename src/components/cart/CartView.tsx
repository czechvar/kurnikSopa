'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Link } from '@/lib/i18n/routing'
import type { Cart, Product, Media } from '@/payload-types'

type Props = {
  cart: Cart
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
  const [items, setItems] = useState(cart.items ?? [])
  const [submitting, startTransition] = useTransition()

  const subtotal = items.reduce((sum, it) => {
    const p = it.product as Product | number
    const price = typeof p === 'object' ? p.price : 0
    return sum + price * it.quantity
  }, 0)

  function persist(nextItems: typeof items) {
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
      if (res.ok) router.refresh()
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

  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-semibold">{t('empty.title')}</h2>
        <p className="text-text-secondary">{t('empty.body')}</p>
        <Link href="/produkty" className="inline-block bg-brand-cream text-brand-green hover:bg-brand-cream-dark px-6 py-3 rounded-lg font-medium">
          {t('empty.cta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-gray-200">
        {items.map((it, idx) => {
          const p = it.product as Product | number
          const name = getProductName(p, locale)
          const img = getProductImage(p)
          const unitPrice = typeof p === 'object' ? p.price : 0
          const minOrder = typeof p === 'object' ? (p.minimumOrder ?? 1) : 1
          return (
            <li key={idx} className="py-4 flex gap-4 items-center">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                {img && <Image src={img} alt={name} width={80} height={80} className="object-cover w-full h-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{name}</div>
                <div className="text-sm text-text-secondary">{formatCzk(unitPrice)}{typeof p === 'object' && p.unit ? ` / ${p.unit}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(idx, Math.max(minOrder, it.quantity - 1))}
                  disabled={submitting || it.quantity <= minOrder}
                  aria-label={t('lineItem.qty')}
                  className="w-8 h-8 rounded border border-gray-300 disabled:opacity-30"
                >−</button>
                <span className="w-8 text-center">{it.quantity}</span>
                <button
                  onClick={() => updateQty(idx, it.quantity + 1)}
                  disabled={submitting}
                  aria-label={t('lineItem.qty')}
                  className="w-8 h-8 rounded border border-gray-300 disabled:opacity-30"
                >+</button>
              </div>
              <div className="w-24 text-right font-semibold">{formatCzk(unitPrice * it.quantity)}</div>
              <button
                onClick={() => remove(idx)}
                disabled={submitting}
                className="text-sm text-red-700 hover:underline"
              >{t('lineItem.remove')}</button>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>{t('summary.subtotal')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t('summary.shipping')}</span>
          <span>{t('summary.shippingFree')}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
          <span>{t('summary.total')}</span>
          <span>{formatCzk(subtotal)}</span>
        </div>
      </div>

      <Link href="/pokladna" className="block w-full text-center bg-brand-cream text-brand-green hover:bg-brand-cream-dark py-3 rounded-lg font-semibold">
        {t('cta.checkout')}
      </Link>
    </div>
  )
}
