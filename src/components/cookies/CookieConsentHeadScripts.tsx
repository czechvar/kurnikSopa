import { defaultDeniedConsent } from './cookie-categories'

export function CookieConsentHeadScripts() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? ''

  const consentDefaultPayload = JSON.stringify({
    ...defaultDeniedConsent(),
    wait_for_update: 500,
  })

  const consentInit = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',${consentDefaultPayload});`

  const gtmLoader = gtmId
    ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
    : ''

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: consentInit }} />
      {gtmLoader ? <script dangerouslySetInnerHTML={{ __html: gtmLoader }} /> : null}
    </>
  )
}

export function CookieConsentBodyNoscript() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? ''
  if (!gtmId) return null

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}
