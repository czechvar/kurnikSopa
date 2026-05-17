'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/routing'

type Props = {
  productId: number
  productName: string
  minimumOrder?: number
  isLoggedIn: boolean
  loginRedirectPath: string
}

export function AddToCartButton({ productId, productName, minimumOrder = 1, isLoggedIn, loginRedirectPath }: Props) {
  const t = useTranslations('cart')
  const tNav = useTranslations('nav.cart')
  const router = useRouter()
  const [qty, setQty] = useState(minimumOrder)
  const [submitting, startTransition] = useTransition()

  function add() {
    if (!isLoggedIn) {
      toast.info(t('added.toast'), {
        description: undefined,
        action: { label: t('added.action'), onClick: () => router.push(`/prihlaseni?next=${encodeURIComponent(loginRedirectPath)}`) },
      })
      router.push(`/prihlaseni?next=${encodeURIComponent(loginRedirectPath)}`)
      return
    }
    startTransition(async () => {
      // 1) GET current cart for this user
      const meRes = await fetch('/api/users/me', { credentials: 'include' })
      const me = (await meRes.json()) as { user?: { id: number } }
      const userId = me.user?.id
      if (!userId) {
        router.push('/prihlaseni')
        return
      }

      const cartRes = await fetch(`/api/carts?where[user][equals]=${userId}&depth=0`, { credentials: 'include' })
      const cartJson = (await cartRes.json()) as { docs: Array<{ id: number; items?: Array<{ product: number; quantity: number }> }> }
      let cartId: number | undefined = cartJson.docs[0]?.id

      const existingItems = cartJson.docs[0]?.items ?? []
      const existingIdx = existingItems.findIndex((it) => it.product === productId)
      const nextItems = [...existingItems]
      if (existingIdx >= 0) {
        nextItems[existingIdx] = { ...nextItems[existingIdx], quantity: nextItems[existingIdx].quantity + qty }
      } else {
        nextItems.push({ product: productId, quantity: qty })
      }

      if (!cartId) {
        // Create cart
        const created = await fetch('/api/carts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ user: userId, items: nextItems }),
        })
        const createdJson = (await created.json()) as { doc?: { id: number } }
        cartId = createdJson.doc?.id
      } else {
        await fetch(`/api/carts/${cartId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ items: nextItems }),
        })
      }

      toast.success(t('added.toast'), {
        description: `${productName} × ${qty}`,
        action: { label: t('added.action'), onClick: () => router.push('/kosik') },
      })
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
        <button
          onClick={() => setQty(Math.max(minimumOrder, qty - 1))}
          disabled={qty <= minimumOrder}
          aria-label={t('lineItem.qty')}
          className="w-10 h-10 disabled:opacity-30"
        >−</button>
        <span className="w-10 text-center">{qty}</span>
        <button
          onClick={() => setQty(qty + 1)}
          aria-label={t('lineItem.qty')}
          className="w-10 h-10"
        >+</button>
      </div>
      <button
        onClick={add}
        disabled={submitting}
        className="flex-1 bg-brand-cream text-brand-green hover:bg-brand-cream-dark py-3 px-6 rounded-lg font-semibold disabled:opacity-60"
      >
        {t('added.toast').replace('Přidáno do', 'Přidat do').replace('Added to', 'Add to')}
      </button>
    </div>
  )
}
