import { buildAuthUrl } from './links'

type Locale = 'cs' | 'en'

const t = {
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
  isBooking?: boolean
}

export function staffNotificationSubject(input: StaffNotificationInput): string {
  return `${input.isBooking ? 'Nová rezervace' : 'Nová objednávka'} ${input.orderNumber} — ${input.customerName}`
}

export function staffNotificationTemplate(input: StaffNotificationInput): string {
  const items = input.items.map(it => `<tr>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)}</td>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.quantity}×</td>
    <td style="padding:6px 4px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCzk(it.lineTotal)}</td>
  </tr>`).join('')

  return wrap('cs', `
    <p style="margin:0 0 16px;font-size:16px;"><strong>${input.isBooking ? 'Přišla nová rezervace na turnus.' : 'Přišla nová objednávka.'}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Číslo: <strong>${escapeHtml(input.orderNumber)}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Zákazník: ${escapeHtml(input.customerName)} (${escapeHtml(input.customerEmail)}${input.customerPhone ? `, ${escapeHtml(input.customerPhone)}` : ''})${input.hasAccount ? '' : ' — bez účtu'}</p>
    <p style="margin:0 0 8px;font-size:14px;">${input.isBooking ? 'Turnus' : 'Vyzvednutí'}: ${escapeHtml(input.pickupPointName)}</p>
    <p style="margin:0 0 8px;font-size:14px;">Platba: hotově při převzetí</p>
    ${input.preferredDate ? `<p style="margin:0 0 8px;font-size:14px;">Preferovaný den: ${escapeHtml(input.preferredDate)}</p>` : ''}
    ${input.customerNote ? `<p style="margin:0 0 8px;font-size:14px;">Poznámka zákazníka: ${escapeHtml(input.customerNote)}</p>` : ''}
    <h2 style="font-size:16px;margin:20px 0 8px;">Položky</h2>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tbody>${items}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:8px 4px;text-align:right;"><strong>${input.isBooking ? 'Odhad' : 'Celkem'}</strong></td>
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

// ─── Invitation ─────────────────────────────────────────────────────────

export type InvitationInput = {
  locale: Locale
  token: string
  firstName?: string | null
  invitedByName?: string | null
  farmPhone?: string | null
}

export function invitationSubject(locale: Locale): string {
  return locale === 'en' ? 'Your invitation to Kurník Šopa' : 'Pozvánka do Kurníku Šopa'
}

export function invitationTemplate(i: InvitationInput): string {
  const en = i.locale === 'en'
  const link = buildAuthUrl(i.locale, 'invite', i.token)
  const greet = en
    ? (i.firstName ? `Hello ${escapeHtml(i.firstName)},` : 'Hello,')
    : (i.firstName ? `Dobrý den ${escapeHtml(i.firstName)},` : 'Dobrý den,')
  const who = i.invitedByName ? escapeHtml(i.invitedByName) : 'Kurník Šopa'
  const intro = en
    ? `${who} has invited you to have an account at Kurník Šopa. With it you see your orders in one place and your details are prefilled at checkout.`
    : `${who} vás zve k založení účtu na Kurník Šopa. Uvidíte v něm své objednávky pohromadě a v pokladně budete mít předvyplněné údaje.`
  const cta = en ? 'Set your password' : 'Nastavit heslo'
  const valid = en ? 'The link is valid for 7 days. If it expires, just call us and we will send a new one.' : 'Odkaz platí 7 dní. Pokud vyprší, zavolejte nám a pošleme nový.'
  const fallback = en ? 'If the button does not work, open this link in your browser:' : 'Pokud tlačítko nefunguje, otevřete tento odkaz v prohlížeči:'
  const phone = i.farmPhone ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${en ? 'Phone' : 'Tel.'}: ${escapeHtml(i.farmPhone)}</p>` : ''
  return wrap(i.locale, `
    <p style="margin:0 0 16px;font-size:16px;">${greet}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${intro}</p>
    ${button(link, cta)}
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${fallback}</p>
    <p style="margin:0 0 16px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:${BRAND};">${link}</a></p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${valid}</p>
    ${phone}
  `)
}

// ─── Access request ─────────────────────────────────────────────────────

export function accessRequestReceivedSubject(locale: Locale): string {
  return locale === 'en' ? 'We received your request for an account' : 'Vaši žádost o účet jsme přijali'
}

export function accessRequestReceivedTemplate(i: { locale: Locale; firstName?: string | null; farmPhone?: string | null }): string {
  const en = i.locale === 'en'
  const greet = en
    ? (i.firstName ? `Hello ${escapeHtml(i.firstName)},` : 'Hello,')
    : (i.firstName ? `Dobrý den ${escapeHtml(i.firstName)},` : 'Dobrý den,')
  const body = en
    ? 'Thanks for asking for an account at Kurník Šopa. We hand accounts out personally, so give us a day or two; the invitation arrives by email. In the meantime you can order without an account.'
    : 'Děkujeme za zájem o účet na Kurník Šopa. Účty vydáváme osobně, dejte nám prosím den dva; pozvánka přijde e-mailem. Mezitím můžete objednávat i bez účtu.'
  const phone = i.farmPhone ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">${en ? 'Phone' : 'Tel.'}: ${escapeHtml(i.farmPhone)}</p>` : ''
  return wrap(i.locale, `
    <p style="margin:0 0 16px;font-size:16px;">${greet}</p>
    <p style="margin:0;font-size:15px;line-height:1.55;">${body}</p>
    ${phone}
  `)
}

export function accessRequestStaffSubject(name: string): string {
  return `Nová žádost o účet — ${name}`
}

export function accessRequestStaffTemplate(i: { name: string; email: string; phone?: string | null; message?: string | null; adminUrl: string }): string {
  return wrap('cs', `
    <p style="margin:0 0 16px;font-size:16px;"><strong>Někdo žádá o účet.</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Jméno: ${escapeHtml(i.name)}</p>
    <p style="margin:0 0 8px;font-size:14px;">E-mail: ${escapeHtml(i.email)}</p>
    ${i.phone ? `<p style="margin:0 0 8px;font-size:14px;">Telefon: ${escapeHtml(i.phone)}</p>` : ''}
    ${i.message ? `<p style="margin:0 0 8px;font-size:14px;">Vzkaz: ${escapeHtml(i.message)}</p>` : ''}
    <p style="margin:16px 0 8px;font-size:14px;">V administraci zaškrtněte „Poslat pozvánku“ a uložte.</p>
    <p style="margin:16px 0 0;">
      <a href="${i.adminUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;">Otevřít v administraci</a>
    </p>
  `)
}

// ─── Batches: booking received ──────────────────────────────────────────

type EstimateLine = { productName: string; quantity: number; estimatedTotal: number; averageWeight?: number | null; unitPrice: number }

function estimateSentence(locale: Locale, e: EstimateLine): string {
  const en = locale === 'en'
  const weight = e.averageWeight ? ` (${en ? 'avg.' : 'prům.'} ${String(e.averageWeight).replace('.', en ? '.' : ',')} kg)` : ''
  return en
    ? `${e.quantity}× ${escapeHtml(e.productName)}${weight}, ${fmtCzk(e.unitPrice)} per kg. Estimate <strong>${fmtCzk(e.estimatedTotal)}</strong>; the final price follows the weight at pickup.`
    : `${e.quantity}× ${escapeHtml(e.productName)}${weight}, ${fmtCzk(e.unitPrice)}/kg. Odhad <strong>${fmtCzk(e.estimatedTotal)}</strong>, konečná cena podle váhy při převzetí.`
}

export type BookingReceivedInput = EstimateLine & {
  locale: Locale
  orderNumber: string
  customerFirstName?: string | null
  batchLabel: string
  orderUrl: string
  ownerName: string
  isGuest: boolean
  merged: boolean
}

export function bookingReceivedSubject(i: BookingReceivedInput): string {
  return i.locale === 'en' ? `Booking ${i.orderNumber} received` : `Rezervace ${i.orderNumber} přijata`
}

export function bookingReceivedTemplate(i: BookingReceivedInput): string {
  const en = i.locale === 'en'
  const greet = en ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,') : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')
  const intro = i.merged
    ? (en ? `We added to your booking for <strong>${escapeHtml(i.batchLabel)}</strong>.` : `Přidali jsme k vaší rezervaci na <strong>${escapeHtml(i.batchLabel)}</strong>.`)
    : (en ? `We have your booking for <strong>${escapeHtml(i.batchLabel)}</strong>.` : `Máme vaši rezervaci na <strong>${escapeHtml(i.batchLabel)}</strong>.`)
  const next = en
    ? 'The pickup dates are not set yet. As soon as they are, you will get an email and confirm your booking (or change the quantity). Nothing is paid now; you pay in cash at pickup.'
    : 'Termíny vyzvednutí zatím nejsou. Jakmile budou, přijde vám e-mail a rezervaci potvrdíte (nebo upravíte počet). Teď nic neplatíte, platí se hotově při převzetí.'
  const keep = i.isGuest ? `<p style="margin:-12px 0 0;font-size:13px;color:#6b7280;">${en ? 'This link is your access to the booking. Please keep this email.' : 'Tento odkaz je váš přístup k rezervaci. E-mail si prosím uschovejte.'}</p>` : ''
  return wrap(i.locale, `
    <p style="margin:0 0 16px;font-size:16px;">${greet}</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${intro}</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${estimateSentence(i.locale, i)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${next}</p>
    ${button(i.orderUrl, en ? 'View booking' : 'Zobrazit rezervaci')}
    ${keep}
    <p style="margin:24px 0 0;font-size:14px;">${en ? 'Regards' : 'S pozdravem'},<br/><strong>${escapeHtml(i.ownerName)}</strong></p>
  `)
}

// ─── Batches: dates confirmed / reminder ────────────────────────────────

export type DatesConfirmedInput = {
  locale: Locale
  orderNumber: string
  customerFirstName?: string | null
  batchLabel: string
  pickupDays: Array<{ day: string; point: string }>
  deadline: string
  orderUrl: string | null
  farmPhone?: string | null
}

function pickupDaysList(days: Array<{ day: string; point: string }>): string {
  return `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;">${days.map(d => `<li>${escapeHtml(d.day)}${d.point ? ` — ${escapeHtml(d.point)}` : ''}</li>`).join('')}</ul>`
}

export function datesConfirmedSubject(i: DatesConfirmedInput): string {
  return i.locale === 'en' ? `${i.batchLabel}: pickup dates are set, please confirm by ${i.deadline}` : `${i.batchLabel}: termíny jsou známé, potvrďte do ${i.deadline}`
}

export function datesConfirmedTemplate(i: DatesConfirmedInput): string {
  const en = i.locale === 'en'
  const greet = en ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,') : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')
  const intro = en
    ? `The pickup dates for <strong>${escapeHtml(i.batchLabel)}</strong> are set. Choose a day and confirm your booking ${i.orderNumber} by <strong>${escapeHtml(i.deadline)}</strong>; unconfirmed bookings are released after that day.`
    : `Termíny vyzvednutí pro <strong>${escapeHtml(i.batchLabel)}</strong> jsou známé. Vyberte si den a potvrďte rezervaci ${i.orderNumber} do <strong>${escapeHtml(i.deadline)}</strong>; nepotvrzené rezervace po tomto dni uvolníme.`
  const phone = i.farmPhone ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">${en ? 'Questions? Call' : 'Dotazy? Volejte'} ${escapeHtml(i.farmPhone)}.</p>` : ''
  return wrap(i.locale, `
    <p style="margin:0 0 16px;font-size:16px;">${greet}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${intro}</p>
    ${pickupDaysList(i.pickupDays)}
    ${i.orderUrl ? button(i.orderUrl, en ? 'Confirm booking' : 'Potvrdit rezervaci') : ''}
    ${phone}
  `)
}

export function confirmationReminderSubject(i: DatesConfirmedInput): string {
  return i.locale === 'en' ? `Reminder: confirm your booking ${i.orderNumber} by ${i.deadline}` : `Připomínka: potvrďte rezervaci ${i.orderNumber} do ${i.deadline}`
}

export function confirmationReminderTemplate(i: DatesConfirmedInput): string {
  const en = i.locale === 'en'
  const greet = en ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,') : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')
  const intro = en
    ? `Your booking ${i.orderNumber} for <strong>${escapeHtml(i.batchLabel)}</strong> is still unconfirmed. Please pick a pickup day by <strong>${escapeHtml(i.deadline)}</strong>, or it will be released.`
    : `Vaše rezervace ${i.orderNumber} na <strong>${escapeHtml(i.batchLabel)}</strong> zatím není potvrzená. Vyberte prosím den vyzvednutí do <strong>${escapeHtml(i.deadline)}</strong>, jinak ji uvolníme.`
  const phone = i.farmPhone ? `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">${en ? 'Questions? Call' : 'Dotazy? Volejte'} ${escapeHtml(i.farmPhone)}.</p>` : ''
  return wrap(i.locale, `
    <p style="margin:0 0 16px;font-size:16px;">${greet}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${intro}</p>
    ${pickupDaysList(i.pickupDays)}
    ${i.orderUrl ? button(i.orderUrl, en ? 'Confirm booking' : 'Potvrdit rezervaci') : ''}
    ${phone}
  `)
}

// ─── Batches: released ──────────────────────────────────────────────────

export type BookingReleasedInput = { locale: Locale; orderNumber: string; customerFirstName?: string | null; batchLabel: string; farmPhone?: string | null }

export function bookingReleasedSubject(i: BookingReleasedInput): string {
  return i.locale === 'en' ? `Booking ${i.orderNumber} released` : `Rezervace ${i.orderNumber} uvolněna`
}

export function bookingReleasedTemplate(i: BookingReleasedInput): string {
  const en = i.locale === 'en'
  const greet = en ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,') : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')
  const body = en
    ? `Your booking ${i.orderNumber} for <strong>${escapeHtml(i.batchLabel)}</strong> was not confirmed by the deadline, so we have released it to other customers. If you still want it, call us${i.farmPhone ? ` on ${escapeHtml(i.farmPhone)}` : ''} and we will see what is left.`
    : `Rezervaci ${i.orderNumber} na <strong>${escapeHtml(i.batchLabel)}</strong> jste do termínu nepotvrdili, uvolnili jsme ji tedy dalším zájemcům. Pokud máte stále zájem, zavolejte${i.farmPhone ? ` na ${escapeHtml(i.farmPhone)}` : ''} a podíváme se, co zbývá.`
  return wrap(i.locale, `
    <p style="margin:0 0 16px;font-size:16px;">${greet}</p>
    <p style="margin:0;font-size:15px;line-height:1.55;">${body}</p>
  `)
}

// ─── Batches: order confirmed ───────────────────────────────────────────

export type BatchOrderConfirmedInput = EstimateLine & {
  locale: Locale
  orderNumber: string
  customerFirstName?: string | null
  batchLabel: string
  pickupDay: string
  pickupPoint: PickupPointSummary
  farmPhone?: string | null
  orderUrl: string
  ownerName: string
  merged: boolean
}

export function batchOrderConfirmedSubject(i: BatchOrderConfirmedInput): string {
  return i.locale === 'en' ? `Booking ${i.orderNumber} confirmed for ${i.pickupDay}` : `Rezervace ${i.orderNumber} potvrzena na ${i.pickupDay}`
}

export function batchOrderConfirmedTemplate(i: BatchOrderConfirmedInput): string {
  const en = i.locale === 'en'
  const greet = en ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,') : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')
  const intro = en
    ? `Your booking for <strong>${escapeHtml(i.batchLabel)}</strong> is confirmed. Pickup on <strong>${escapeHtml(i.pickupDay)}</strong>.`
    : `Vaše rezervace na <strong>${escapeHtml(i.batchLabel)}</strong> je potvrzena. Vyzvednutí <strong>${escapeHtml(i.pickupDay)}</strong>.`
  const cash = en ? 'You pay in cash at pickup, by the actual weight.' : 'Platíte hotově při převzetí podle skutečné váhy.'
  return wrap(i.locale, `
    <p style="margin:0 0 16px;font-size:16px;">${greet}</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${intro}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${estimateSentence(i.locale, i)}</p>
    ${pickupBlock(i.locale, i.pickupPoint, i.farmPhone)}
    <p style="margin:12px 0 24px;font-size:15px;">${cash}</p>
    ${button(i.orderUrl, en ? 'View booking' : 'Zobrazit rezervaci')}
    <p style="margin:24px 0 0;font-size:14px;">${en ? 'Regards' : 'S pozdravem'},<br/><strong>${escapeHtml(i.ownerName)}</strong></p>
  `)
}
