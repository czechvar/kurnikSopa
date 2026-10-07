'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/lib/i18n/routing'
import { ensureGuestToken } from '@/lib/cart/guestToken.client'
import { buttonClass } from '@/components/ui/button'

type Props = {
  productId: number
  productName: string
  minimumOrder?: number
}

type AddResponse = { ok: boolean; count?: number; reason?: string; min?: number }

/**
 * Adds to the viewer's cart through one server endpoint, for guests and
 * signed-in customers alike. A guest gets a cart cookie on first click.
 */
export function AddToCartButton({ productId, productName, minimumOrder = 1 }: Props) {
  const t = useTranslations('cart')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [qty, setQty] = useState(minimumOrder)
  const [submitting, startTransition] = useTransition()

  function add() {
    ensureGuestToken()
    startTransition(async () => {
      let json: AddResponse
      try {
        const res = await fetch('/api/carts/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId, quantity: qty }),
        })
        json = (await res.json()) as AddResponse
      } catch {
        json = { ok: false }
      }

      if (!json.ok) {
        if (json.reason === 'belowMinimumOrder') toast.error(t('errors.belowMinimumOrder', { min: json.min ?? minimumOrder }))
        else if (json.reason === 'outOfStock' || json.reason === 'outOfSeason' || json.reason === 'productNotFound') toast.error(t('errors.unavailable'))
        else toast.error(t('errors.generic'))
        return
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
      <div className="flex items-center gap-1 rounded border-2 border-ink">
        <button
          type="button"
          onClick={() => setQty(Math.max(minimumOrder, qty - 1))}
          disabled={qty <= minimumOrder}
          aria-label={t('lineItem.qty')}
          className="h-10 w-10 disabled:opacity-30"
        >−</button>
        <span className="w-10 text-center" aria-live="polite">{qty}</span>
        <button
          type="button"
          onClick={() => setQty(qty + 1)}
          aria-label={t('lineItem.qty')}
          className="h-10 w-10"
        >+</button>
      </div>
      <button
        type="button"
        onClick={add}
        disabled={submitting}
        className={buttonClass('primary', 'md', 'flex-1')}
      >
        {tCommon('addToCart')}
      </button>
    </div>
  )
}
