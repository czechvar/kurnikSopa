import { buildAuthUrl } from './links'

type Locale = 'cs' | 'en'

const t = {
  verify: {
    cs: {
      subject: 'Ověřte svůj e-mail',
      greeting: (name?: string) => (name ? `Dobrý den ${name},` : 'Dobrý den,'),
      intro:
        'Děkujeme za registraci na Kurník Šopa. Pro dokončení prosím ověřte svou e-mailovou adresu kliknutím na tlačítko níže.',
      button: 'Ověřit e-mail',
      fallback: 'Pokud tlačítko nefunguje, otevřete tento odkaz v prohlížeči:',
      footer: 'Pokud jste se neregistrovali, můžete tento e-mail ignorovat.',
    },
    en: {
      subject: 'Verify your email',
      greeting: (name?: string) => (name ? `Hello ${name},` : 'Hello,'),
      intro:
        'Thanks for signing up to Kurník Šopa. Please verify your email address by clicking the button below.',
      button: 'Verify email',
      fallback: 'If the button does not work, open this link in your browser:',
      footer: 'If you did not sign up, you can ignore this email.',
    },
  },
  forgot: {
    cs: {
      subject: 'Obnovení hesla',
      greeting: (name?: string) => (name ? `Dobrý den ${name},` : 'Dobrý den,'),
      intro: 'Obdrželi jsme žádost o obnovení hesla pro váš účet. Pokračujte kliknutím na tlačítko níže.',
      button: 'Obnovit heslo',
      fallback: 'Pokud tlačítko nefunguje, otevřete tento odkaz v prohlížeči:',
      footer: 'Pokud jste o obnovení nežádali, můžete tento e-mail ignorovat — vaše heslo se nezmění.',
    },
    en: {
      subject: 'Reset your password',
      greeting: (name?: string) => (name ? `Hello ${name},` : 'Hello,'),
      intro: 'We received a request to reset the password for your account. Click the button below to continue.',
      button: 'Reset password',
      fallback: 'If the button does not work, open this link in your browser:',
      footer: 'If you did not request a reset, you can ignore this email — your password will not change.',
    },
  },
} as const

const BRAND = '#285A5B'

function wrap(locale: Locale, body: string): string {
  const tagline = locale === 'en' ? 'Regenerative farm' : 'Regenerativní farma'
  return `<!DOCTYPE html>
<html lang="${locale}">
<body style="margin:0;padding:0;background:#f6f3eb;font-family:system-ui,-apple-system,sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;">
      <div style="font-weight:800;font-size:20px;color:${BRAND};margin-bottom:24px;">Kurník Šopa</div>
      ${body}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
        Kurník Šopa · ${tagline}
      </div>
    </div>
  </div>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 24px;">
      <a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${label}</a>
    </p>`
}

export function verifyEmailTemplate(input: {
  locale: Locale
  token: string
  email: string
  firstName?: string
}): string {
  const c = t.verify[input.locale]
  const link = buildAuthUrl(input.locale, 'verify', input.token, input.email)
  return wrap(
    input.locale,
    `
    <p style="margin:0 0 16px;font-size:16px;">${c.greeting(input.firstName)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${c.intro}</p>
    ${button(link, c.button)}
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${c.fallback}</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:${BRAND};">${link}</a></p>
    <p style="margin:0;font-size:13px;color:#6b7280;">${c.footer}</p>
    `,
  )
}

export function forgotPasswordTemplate(input: {
  locale: Locale
  token: string
  firstName?: string
}): string {
  const c = t.forgot[input.locale]
  const link = buildAuthUrl(input.locale, 'reset', input.token)
  return wrap(
    input.locale,
    `
    <p style="margin:0 0 16px;font-size:16px;">${c.greeting(input.firstName)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${c.intro}</p>
    ${button(link, c.button)}
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${c.fallback}</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:${BRAND};">${link}</a></p>
    <p style="margin:0;font-size:13px;color:#6b7280;">${c.footer}</p>
    `,
  )
}

// ─── Shared pieces ───────────────────────────────────────────────────────

export type PickupPointSummary = {
  name: string
  street: string
  city: string
  zip: string
  note?: string | null
}

function fmtCzk(n: number): string {
  // Server-side; do not rely on Intl runtime variance. Group thousands with non-breaking spaces.
  const rounded = Math.round(n)
  return `${rounded.toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function fmtPickup(p: PickupPointSummary): string {
  return `${p.street}, ${p.zip} ${p.city}`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch] as string)
}

function pickupBlock(locale: Locale, p: PickupPointSummary, phone: string | null | undefined): string {
  const labels = locale === 'en'
    ? { where: 'Pickup point', phone: 'Phone' }
    : { where: 'Odběrné místo', phone: 'Tel.' }
  return `
    <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${labels.where}</p>
    <p style="margin:0 0 4px;font-size:15px;"><strong>${escapeHtml(p.name)}</strong></p>
    <p style="margin:0 0 4px;font-size:14px;">${escapeHtml(fmtPickup(p))}</p>
    ${p.note ? `<p style="margin:0 0 4px;font-size:14px;color:#374151;">${escapeHtml(p.note)}</p>` : ''}
    ${phone ? `<p style="margin:0 0 12px;font-size:14px;">${labels.phone}: ${escapeHtml(phone)}</p>` : ''}`
}

// ─── Order confirmation ─────────────────────────────────────────────────

export type OrderConfirmationInput = {
  locale: Locale
  orderNumber: string
  customerFirstName?: string | null
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; unit?: string | null }>
  totalAmount: number
  pickupPoint: PickupPointSummary
  farmPhone?: string | null
  preferredDate?: string | null    // pre-formatted, locale-specific
  customerNote?: string | null
  ownerName: string
  /** Tokenised link to the order page; the only way back for a guest. */
  orderUrl: string
  isGuest: boolean
}

const ocCopy = {
  cs: {
    subject: (n: string) => `Objednávka č. ${n} přijata`,
    greeting: (name?: string | null) => name ? `Dobrý den ${name},` : 'Dobrý den,',
    intro: 'Děkujeme za objednávku v Kurníku Šopa. Níže najdete shrnutí a kde a kdy si ji vyzvednete.',
    summaryTitle: 'Vaše objednávka',
    pickupTitle: 'Vyzvednutí',
    paymentTitle: 'Platba',
    preferredDateLabel: (d: string) => `Preferovaný den vyzvednutí: ${d}`,
    customerNoteLabel: (n: string) => `Poznámka: ${n}`,
    cashPay: (amt: string) => `Částku <strong>${amt}</strong> uhradíte hotově při převzetí. Předem nic neplatíte.`,
    viewOrder: 'Zobrazit objednávku',
    guestHint: 'Tento odkaz je váš přístup k objednávce — e-mail si prosím uschovejte.',
    closing: (owner: string) => `Brzy se vám ozveme.<br/>S pozdravem,<br/><strong>${owner}</strong>`,
    qty: 'Množství',
    unitPrice: 'Cena/ks',
    lineTotal: 'Celkem',
    total: 'Celkem',
  },
  en: {
    subject: (n: string) => `Order #${n} received`,
    greeting: (name?: string | null) => name ? `Hello ${name},` : 'Hello,',
    intro: 'Thanks for your order at Kurník Šopa. Below is the summary and where and when to collect it.',
    summaryTitle: 'Your order',
    pickupTitle: 'Pickup',
    paymentTitle: 'Payment',
    preferredDateLabel: (d: string) => `Preferred pickup day: ${d}`,
    customerNoteLabel: (n: string) => `Note: ${n}`,
    cashPay: (amt: string) => `You'll pay <strong>${amt}</strong> in cash when you collect. Nothing is charged up front.`,
    viewOrder: 'View order',
    guestHint: 'This link is your access to the order — please keep this email.',
    closing: (owner: string) => `We'll be in touch soon.<br/>Regards,<br/><strong>${owner}</strong>`,
    qty: 'Quantity',
    unitPrice: 'Unit price',
    lineTotal: 'Total',
    total: 'Total',
  },
} as const

export function orderConfirmationSubject(input: OrderConfirmationInput): string {
  return ocCopy[input.locale].subject(input.orderNumber)
}

export function orderConfirmationTemplate(input: OrderConfirmationInput): string {
  const c = ocCopy[input.locale]

  const itemsHtml = input.items.map(it => `
    <tr>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)}${it.unit ? ` <span style="color:#6b7280;">(${escapeHtml(it.unit)})</span>` : ''}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.quantity}×</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCzk(it.unitPrice)}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>${fmtCzk(it.lineTotal)}</strong></td>
    </tr>`).join('')

  const summary = `
    <h2 style="font-size:18px;margin:24px 0 12px;">${c.summaryTitle}</h2>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="color:#6b7280;text-align:left;">
          <th style="padding:8px 4px;font-weight:500;">${c.summaryTitle}</th>
          <th style="padding:8px 4px;text-align:right;font-weight:500;">${c.qty}</th>
          <th style="padding:8px 4px;text-align:right;font-weight:500;">${c.unitPrice}</th>
          <th style="padding:8px 4px;text-align:right;font-weight:500;">${c.lineTotal}</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px 4px;text-align:right;"><strong>${c.total}</strong></td>
          <td style="padding:12px 4px;text-align:right;"><strong>${fmtCzk(input.totalAmount)}</strong></td>
        </tr>
      </tfoot>
    </table>`

  let pickup = `<h2 style="font-size:18px;margin:24px 0 12px;">${c.pickupTitle}</h2>`
  pickup += pickupBlock(input.locale, input.pickupPoint, input.farmPhone)
  if (input.preferredDate) pickup += `<p style="margin:0 0 8px;font-size:14px;">${c.preferredDateLabel(escapeHtml(input.preferredDate))}</p>`
  if (input.customerNote)  pickup += `<p style="margin:0 0 8px;font-size:14px;">${c.customerNoteLabel(escapeHtml(input.customerNote))}</p>`

  const payment = `
    <h2 style="font-size:18px;margin:24px 0 12px;">${c.paymentTitle}</h2>
    <p style="margin:0 0 8px;font-size:15px;">${c.cashPay(fmtCzk(input.totalAmount))}</p>`

  const link = `
    <div style="margin:24px 0 0;">
      ${button(input.orderUrl, c.viewOrder)}
      ${input.isGuest ? `<p style="margin:-12px 0 0;font-size:13px;color:#6b7280;">${c.guestHint}</p>` : ''}
    </div>`

  const body = `
    <p style="margin:0 0 16px;font-size:16px;">${c.greeting(input.customerFirstName ?? null)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${c.intro}</p>
    ${summary}
    ${pickup}
    ${payment}
    ${link}
    <p style="margin:24px 0 0;font-size:14px;">${c.closing(input.ownerName)}</p>
  `
  return wrap(input.locale, body)
}

// ─── Staff notification ─────────────────────────────────────────────────

export type StaffNotificationInput = {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  hasAccount: boolean
  totalAmount: number
  pickupPointName: string
  preferredDate?: string | null
  customerNote?: string | null
  items: Array<{ name: string; quantity: number; lineTotal: number }>
  adminUrl: string
}

export function staffNotificationSubject(input: StaffNotificationInput): string {
  return `Nová objednávka ${input.orderNumber} — ${input.customerName}`
}

export function staffNotificationTemplate(input: StaffNotificationInput): string {
  const items = input.items.map(it => `<tr>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)}</td>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.quantity}×</td>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCzk(it.lineTotal)}</td>
  </tr>`).join('')

  return wrap('cs', `
    <p style="margin:0 0 16px;font-size:16px;"><strong>Přišla nová objednávka.</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Číslo: <strong>${escapeHtml(input.orderNumber)}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Zákazník: ${escapeHtml(input.customerName)} (${escapeHtml(input.customerEmail)}${input.customerPhone ? `, ${escapeHtml(input.customerPhone)}` : ''})${input.hasAccount ? '' : ' — bez účtu'}</p>
    <p style="margin:0 0 8px;font-size:14px;">Vyzvednutí: ${escapeHtml(input.pickupPointName)}</p>
    <p style="margin:0 0 8px;font-size:14px;">Platba: hotově při převzetí</p>
    ${input.preferredDate ? `<p style="margin:0 0 8px;font-size:14px;">Preferovaný den: ${escapeHtml(input.preferredDate)}</p>` : ''}
    ${input.customerNote ? `<p style="margin:0 0 8px;font-size:14px;">Poznámka zákazníka: ${escapeHtml(input.customerNote)}</p>` : ''}
    <h2 style="font-size:16px;margin:20px 0 8px;">Položky</h2>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tbody>${items}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:8px 4px;text-align:right;"><strong>Celkem</strong></td>
        <td style="padding:8px 4px;text-align:right;"><strong>${fmtCzk(input.totalAmount)}</strong></td>
      </tr></tfoot>
    </table>
    <p style="margin:24px 0 0;">
      <a href="${input.adminUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;">Otevřít v administraci</a>
    </p>
  `)
}

// ─── Order ready for pickup ─────────────────────────────────────────────

export type OrderReadyInput = {
  locale: Locale
  orderNumber: string
  customerFirstName?: string | null
  pickupPoint: PickupPointSummary
  farmPhone?: string | null
  totalAmount: number
  orderUrl?: string | null
}

export function orderReadySubject(i: OrderReadyInput): string {
  return i.locale === 'en'
    ? `Your order #${i.orderNumber} is ready for pickup`
    : `Vaše objednávka ${i.orderNumber} je připravena k vyzvednutí`
}

export function orderReadyTemplate(i: OrderReadyInput): string {
  const en = i.locale === 'en'
  const greet = en
    ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,')
    : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')
  const lead = en
    ? `Your order <strong>#${i.orderNumber}</strong> is ready for pickup.`
    : `Vaše objednávka <strong>${i.orderNumber}</strong> je připravena k vyzvednutí.`
  const cash = en
    ? `Please bring <strong>${fmtCzk(i.totalAmount)}</strong> in cash.`
    : `Vezměte si prosím <strong>${fmtCzk(i.totalAmount)}</strong> v hotovosti.`

  let body = `<p style="margin:0 0 16px;">${greet}</p>
    <p style="margin:0 0 16px;">${lead}</p>
    ${pickupBlock(i.locale, i.pickupPoint, i.farmPhone)}
    <p style="margin:12px 0 16px;">${cash}</p>`
  if (i.orderUrl) body += button(i.orderUrl, en ? 'View order' : 'Zobrazit objednávku')
  return wrap(i.locale, body)
}
