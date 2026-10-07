type ErrorContext = 'request' | 'invite' | 'login' | 'forgot' | 'reset' | 'account'

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

  if (context === 'request') {
    if (status === 429) return 'auth.request.errors.rateLimited'
    if (field === 'email') return 'auth.request.errors.emailInvalid'
    return 'auth.request.errors.generic'
  }

  if (context === 'invite') {
    if (message.includes('passwordtooshort')) return 'auth.invite.errors.passwordTooShort'
    if (status === 400 || message.includes('token')) return 'auth.invite.errors.tokenExpired'
    return 'auth.invite.errors.generic'
  }

  if (context === 'login') {
    if (status === 403 && message.includes('blocked')) return 'auth.login.errors.accountBlocked'
    if (status === 403 && message.includes('notactive')) return 'auth.login.errors.accountNotActive'
    if (status === 401) return 'auth.login.errors.invalidCredentials'
    return 'auth.login.errors.generic'
  }

  if (context === 'reset') {
    if (message.includes('token') || status === 400) {
      return 'auth.reset.errors.tokenExpired'
    }
    return 'auth.reset.errors.generic'
  }

  if (context === 'account') {
    if (message.includes('password')) return 'account.password.errors.currentWrong'
    return 'account.personal.errors.generic'
  }

  return `${context}.errors.generic`
}
