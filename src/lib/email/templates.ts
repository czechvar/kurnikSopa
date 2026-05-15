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
