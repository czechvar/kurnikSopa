type ErrorContext = 'signup' | 'login' | 'forgot' | 'reset' | 'verify' | 'account'

interface PayloadErrorBody {
  errors?: Array<{ message?: string; data?: { code?: string; field?: string } }>
  message?: string
}

export function mapPayloadError(
  status: number,
  body: unknown,
  context: ErrorContext,
): string {
  const b = (body ?? {}) as PayloadErrorBody
  const message = (b.message ?? b.errors?.[0]?.message ?? '').toLowerCase()
  const field = b.errors?.[0]?.data?.field
  const code = b.errors?.[0]?.data?.code

  if (context === 'signup') {
    if (field === 'email' && (code === 'unique' || message.includes('already'))) {
      return 'auth.signup.errors.emailTaken'
    }
    if (field === 'email') return 'auth.signup.errors.emailInvalid'
    if (field === 'password') return 'auth.signup.errors.passwordTooShort'
    return 'auth.signup.errors.generic'
  }

  if (context === 'login') {
    if (status === 401 && message.includes('verified')) {
      return 'auth.login.errors.notVerified'
    }
    if (status === 401) return 'auth.login.errors.invalidCredentials'
    return 'auth.login.errors.generic'
  }

  if (context === 'reset') {
    if (message.includes('token') || status === 400) {
      return 'auth.reset.errors.tokenExpired'
    }
    return 'auth.reset.errors.generic'
  }

  if (context === 'verify') {
    return 'auth.verify.tokenExpired'
  }

  if (context === 'account') {
    if (message.includes('password')) return 'account.password.errors.currentWrong'
    return 'account.personal.errors.generic'
  }

  return `${context}.errors.generic`
}
