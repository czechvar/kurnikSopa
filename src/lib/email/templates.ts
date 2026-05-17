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

function wrap(locale: Locale, body: string): string {
  const tagline = locale === 'en' ? 'Czech country farm' : 'Český statek'
  return `<!DOCTYPE html>
<html lang="${locale}">
<body style="margin:0;padding:0;background:#f6f3eb;font-family:system-ui,-apple-system,sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;">
      <div style="font-weight:800;font-size:20px;color:#2d5016;margin-bottom:24px;">Kurník Šopa</div>
      ${body}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
        Kurník Šopa · ${tagline}
      </div>
    </div>
  </div>
</body>
</html>`
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
    <p style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#2d5016;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${c.button}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${c.fallback}</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#2d5016;">${link}</a></p>
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
    <p style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;background:#2d5016;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${c.button}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${c.fallback}</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:#2d5016;">${link}</a></p>
    <p style="margin:0;font-size:13px;color:#6b7280;">${c.footer}</p>
    `,
  )
}

type CzAccount = { prefix?: string | null; account: string; bankCode: string; bankName?: string | null }

export type OrderConfirmationInput = {
  locale: 'cs' | 'en'
  orderNumber: string
  customerFirstName?: string | null
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number; unit?: string | null }>
  totalAmount: number
  deliveryMethod: 'pickup' | 'delivery'
  deliveryAddress?: { street: string; city: string; zip: string } | null
  farmAddress: { street: string; city: string; zip: string }
  farmPhone?: string | null
  farmOpeningHours?: string | null
  preferredDate?: string | null    // pre-formatted, locale-specific
  customerNote?: string | null
  paymentMethod: 'bank_transfer' | 'cash_on_delivery'
  bank?: { account: CzAccount; iban: string; amountFormatted: string; vs: string; messageForRecipient: string } | null
  ownerName: string
  hasQrCid: boolean    // true when the caller will attach a cid:order-qr image
}

const ocCopy = {
  cs: {
    subject: (n: string) => `Objednávka č. ${n} přijata`,
    greeting: (name?: string | null) => name ? `Dobrý den ${name},` : 'Dobrý den,',
    intro: 'Děkujeme za objednávku v Kurníku Šopa. Níže najdete shrnutí a pokyny k platbě.',
    summaryTitle: 'Vaše objednávka',
    deliveryTitle: 'Doručení',
    paymentTitle: 'Platba',
    pickup: 'Osobní odběr',
    delivery: 'Doručení',
    deliveryFree: 'Zdarma v rámci regionu',
    pickupAt: (addr: string, hours: string | null | undefined, phone: string | null | undefined) =>
      `Osobní odběr na adrese: ${addr}.${hours ? ` Otevírací doba: ${hours}.` : ''}${phone ? ` Tel.: ${phone}.` : ''}`,
    deliveryTo: (addr: string) => `Doručíme na: ${addr}. Doprava zdarma v rámci regionu.`,
    preferredDateLabel: (d: string) => `Preferované datum: ${d}`,
    customerNoteLabel: (n: string) => `Poznámka: ${n}`,
    bankPrompt: (amt: string) => `Prosíme uhraďte částku <strong>${amt}</strong> převodem na náš účet.`,
    bankScan: 'Naskenujte QR kód v aplikaci své banky:',
    bankManual: 'Pokud váš banking nepodporuje QR, vyplňte údaje ručně:',
    cashPay: (amt: string) => `Částku <strong>${amt}</strong> uhradíte v hotovosti při odběru / doručení.`,
    accountLabel: 'Číslo účtu',
    bankLabel: 'Banka',
    vsLabel: 'Variabilní symbol',
    amountLabel: 'Částka',
    messageLabel: 'Zpráva pro příjemce',
    closing: (owner: string) => `Brzy se vám ozveme.<br/>S pozdravem,<br/><strong>${owner}</strong>`,
    qty: 'Množství',
    unitPrice: 'Cena/ks',
    lineTotal: 'Celkem',
    total: 'Celkem',
  },
  en: {
    subject: (n: string) => `Order #${n} received`,
    greeting: (name?: string | null) => name ? `Hello ${name},` : 'Hello,',
    intro: 'Thanks for your order at Kurník Šopa. Below is the summary and payment instructions.',
    summaryTitle: 'Your order',
    deliveryTitle: 'Delivery',
    paymentTitle: 'Payment',
    pickup: 'Pickup at farm',
    delivery: 'Delivery',
    deliveryFree: 'Free within region',
    pickupAt: (addr: string, hours: string | null | undefined, phone: string | null | undefined) =>
      `Pickup at: ${addr}.${hours ? ` Opening hours: ${hours}.` : ''}${phone ? ` Phone: ${phone}.` : ''}`,
    deliveryTo: (addr: string) => `We'll deliver to: ${addr}. Free delivery within region.`,
    preferredDateLabel: (d: string) => `Preferred date: ${d}`,
    customerNoteLabel: (n: string) => `Note: ${n}`,
    bankPrompt: (amt: string) => `Please pay <strong>${amt}</strong> by bank transfer to our account.`,
    bankScan: 'Scan the QR code in your banking app:',
    bankManual: "If your banking app doesn't support QR, enter the details manually:",
    cashPay: (amt: string) => `You'll pay <strong>${amt}</strong> in cash on pickup / delivery.`,
    accountLabel: 'Account number',
    bankLabel: 'Bank',
    vsLabel: 'Variable symbol',
    amountLabel: 'Amount',
    messageLabel: 'Message for recipient',
    closing: (owner: string) => `We'll be in touch soon.<br/>Regards,<br/><strong>${owner}</strong>`,
    qty: 'Quantity',
    unitPrice: 'Unit price',
    lineTotal: 'Total',
    total: 'Total',
  },
} as const

function fmtCzk(n: number): string {
  // Server-side; do not rely on Intl runtime variance. Group thousands with non-breaking spaces.
  const rounded = Math.round(n)
  return `${rounded.toLocaleString('cs-CZ').replace(/\s/g, ' ')} Kč`
}

function fmtAddress(a: { street: string; city: string; zip: string }): string {
  return `${a.street}, ${a.zip} ${a.city}`
}

function fmtCzAccount(a: CzAccount): string {
  const left = a.prefix ? `${a.prefix.replace(/\D/g, '')}-` : ''
  return `${left}${a.account.replace(/\D/g, '')}/${a.bankCode.replace(/\D/g, '')}`
}

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

  let deliveryBlock = `<h2 style="font-size:18px;margin:24px 0 12px;">${c.deliveryTitle}</h2>`
  if (input.deliveryMethod === 'pickup') {
    deliveryBlock += `<p style="margin:0 0 12px;font-size:14px;">${c.pickupAt(fmtAddress(input.farmAddress), input.farmOpeningHours ?? null, input.farmPhone ?? null)}</p>`
  } else if (input.deliveryAddress) {
    deliveryBlock += `<p style="margin:0 0 12px;font-size:14px;">${c.deliveryTo(fmtAddress(input.deliveryAddress))}</p>`
  }
  if (input.preferredDate) deliveryBlock += `<p style="margin:0 0 8px;font-size:14px;">${c.preferredDateLabel(escapeHtml(input.preferredDate))}</p>`
  if (input.customerNote)  deliveryBlock += `<p style="margin:0 0 8px;font-size:14px;">${c.customerNoteLabel(escapeHtml(input.customerNote))}</p>`

  let paymentBlock = `<h2 style="font-size:18px;margin:24px 0 12px;">${c.paymentTitle}</h2>`
  if (input.paymentMethod === 'bank_transfer' && input.bank) {
    const acc = fmtCzAccount(input.bank.account)
    const detailRow = (label: string, value: string) => `
      <tr>
        <td style="padding:6px 4px;color:#6b7280;font-size:14px;">${label}</td>
        <td style="padding:6px 4px;font-size:14px;"><strong>${escapeHtml(value)}</strong></td>
      </tr>`
    paymentBlock += `<p style="margin:0 0 12px;font-size:15px;">${c.bankPrompt(input.bank.amountFormatted)}</p>`
    if (input.hasQrCid) {
      paymentBlock += `
        <p style="margin:0 0 12px;font-size:14px;">${c.bankScan}</p>
        <p style="margin:0 0 16px;text-align:center;"><img src="cid:order-qr" width="280" height="280" alt="QR" style="display:inline-block;border:1px solid #e5e7eb;border-radius:8px;"></p>
        <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${c.bankManual}</p>`
    }
    paymentBlock += `
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${detailRow(c.accountLabel, acc)}
        ${input.bank.account.bankName ? detailRow(c.bankLabel, input.bank.account.bankName) : ''}
        ${detailRow(c.amountLabel, input.bank.amountFormatted)}
        ${detailRow(c.vsLabel, input.bank.vs)}
        ${detailRow(c.messageLabel, input.bank.messageForRecipient)}
      </table>`
  } else if (input.paymentMethod === 'cash_on_delivery') {
    paymentBlock += `<p style="margin:0 0 8px;font-size:15px;">${c.cashPay(fmtCzk(input.totalAmount))}</p>`
  }

  const body = `
    <p style="margin:0 0 16px;font-size:16px;">${c.greeting(input.customerFirstName ?? null)}</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${c.intro}</p>
    ${summary}
    ${deliveryBlock}
    ${paymentBlock}
    <p style="margin:24px 0 0;font-size:14px;">${c.closing(input.ownerName)}</p>
  `
  return wrap(input.locale, body)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch] as string)
}

// ─── Staff notification ─────────────────────────────────────────────────

export type StaffNotificationInput = {
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  totalAmount: number
  deliveryMethod: 'pickup' | 'delivery' | 'balikovna'
  paymentMethod: 'bank_transfer' | 'cash_on_delivery' | 'stripe'
  deliveryAddress?: { street: string; city: string; zip: string } | null
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

  const deliveryLine = input.deliveryMethod === 'pickup'
    ? 'Osobní odběr'
    : input.deliveryAddress
      ? `Doručení na: ${escapeHtml(fmtAddress(input.deliveryAddress))}`
      : 'Doručení (adresa chybí)'

  const paymentLine = input.paymentMethod === 'bank_transfer'
    ? 'Bankovní převod (čeká na platbu)'
    : input.paymentMethod === 'cash_on_delivery'
      ? 'Hotově při odběru / doručení'
      : 'Karta (Stripe)'

  return wrap('cs', `
    <p style="margin:0 0 16px;font-size:16px;"><strong>Přišla nová objednávka.</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Číslo: <strong>${escapeHtml(input.orderNumber)}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;">Zákazník: ${escapeHtml(input.customerName)} (${escapeHtml(input.customerEmail)}${input.customerPhone ? `, ${escapeHtml(input.customerPhone)}` : ''})</p>
    <p style="margin:0 0 8px;font-size:14px;">Doručení: ${deliveryLine}</p>
    <p style="margin:0 0 8px;font-size:14px;">Platba: ${paymentLine}</p>
    ${input.preferredDate ? `<p style="margin:0 0 8px;font-size:14px;">Preferované datum: ${escapeHtml(input.preferredDate)}</p>` : ''}
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
      <a href="${input.adminUrl}" style="display:inline-block;background:#2d5016;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;">Otevřít v administraci</a>
    </p>
  `)
}

// ─── Payment received ───────────────────────────────────────────────────

export type PaymentReceivedInput = {
  locale: 'cs' | 'en'
  orderNumber: string
  customerFirstName?: string | null
  deliveryMethod: 'pickup' | 'delivery' | 'balikovna'
}

export function paymentReceivedSubject(i: PaymentReceivedInput): string {
  return i.locale === 'en' ? `Payment received for order #${i.orderNumber}` : `Platba k objednávce ${i.orderNumber} přijata`
}

export function paymentReceivedTemplate(i: PaymentReceivedInput): string {
  const isPickup = i.deliveryMethod === 'pickup'
  const body = i.locale === 'en'
    ? `<p style="margin:0 0 16px;">${i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,'}</p>
       <p style="margin:0 0 16px;">Thanks, we've received your payment for order <strong>#${i.orderNumber}</strong>. We're preparing your order now.</p>
       <p style="margin:0;">${isPickup ? "We'll send another email when your order is ready for pickup." : "We'll be in touch shortly to arrange delivery time."}</p>`
    : `<p style="margin:0 0 16px;">${i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,'}</p>
       <p style="margin:0 0 16px;">Děkujeme, platba k objednávce <strong>${i.orderNumber}</strong> dorazila. Vaši objednávku již připravujeme.</p>
       <p style="margin:0;">${isPickup ? 'Až bude objednávka připravená k odběru, dáme vědět dalším e-mailem.' : 'Brzy vás budeme kontaktovat ohledně termínu doručení.'}</p>`
  return wrap(i.locale, body)
}

// ─── Order shipped / ready ──────────────────────────────────────────────

export type OrderShippedInput = {
  locale: 'cs' | 'en'
  orderNumber: string
  customerFirstName?: string | null
  deliveryMethod: 'pickup' | 'delivery' | 'balikovna'
  farmAddress: { street: string; city: string; zip: string }
  farmPhone?: string | null
  farmOpeningHours?: string | null
}

export function orderShippedSubject(i: OrderShippedInput): string {
  if (i.deliveryMethod === 'pickup') {
    return i.locale === 'en' ? `Your order #${i.orderNumber} is ready for pickup` : `Vaše objednávka ${i.orderNumber} je připravena k odběru`
  }
  return i.locale === 'en' ? `Your order #${i.orderNumber} is on its way` : `Vaše objednávka ${i.orderNumber} je na cestě`
}

export function orderShippedTemplate(i: OrderShippedInput): string {
  const greet = i.locale === 'en'
    ? (i.customerFirstName ? `Hello ${escapeHtml(i.customerFirstName)},` : 'Hello,')
    : (i.customerFirstName ? `Dobrý den ${escapeHtml(i.customerFirstName)},` : 'Dobrý den,')

  let body = `<p style="margin:0 0 16px;">${greet}</p>`
  if (i.deliveryMethod === 'pickup') {
    const addr = fmtAddress(i.farmAddress)
    body += i.locale === 'en'
      ? `<p style="margin:0 0 16px;">Your order <strong>#${i.orderNumber}</strong> is ready for pickup.</p>
         <p style="margin:0 0 8px;">Address: <strong>${escapeHtml(addr)}</strong></p>
         ${i.farmOpeningHours ? `<p style="margin:0 0 8px;">Opening hours: ${escapeHtml(i.farmOpeningHours)}</p>` : ''}
         ${i.farmPhone ? `<p style="margin:0 0 8px;">Phone: ${escapeHtml(i.farmPhone)}</p>` : ''}`
      : `<p style="margin:0 0 16px;">Vaši objednávku <strong>${i.orderNumber}</strong> si můžete vyzvednout.</p>
         <p style="margin:0 0 8px;">Adresa: <strong>${escapeHtml(addr)}</strong></p>
         ${i.farmOpeningHours ? `<p style="margin:0 0 8px;">Otevírací doba: ${escapeHtml(i.farmOpeningHours)}</p>` : ''}
         ${i.farmPhone ? `<p style="margin:0 0 8px;">Tel.: ${escapeHtml(i.farmPhone)}</p>` : ''}`
  } else {
    body += i.locale === 'en'
      ? `<p style="margin:0 0 16px;">Your order <strong>#${i.orderNumber}</strong> is on its way. We'll contact you shortly with the delivery time.</p>`
      : `<p style="margin:0 0 16px;">Vaši objednávku <strong>${i.orderNumber}</strong> vezeme. Brzy vás budeme kontaktovat ohledně času doručení.</p>`
  }
  return wrap(i.locale, body)
}
