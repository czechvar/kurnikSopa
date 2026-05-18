type Captured = {
  to: string
  from?: string
  subject: string
  html?: string
  text?: string
  attachments?: unknown[]
  replyTo?: string
}

export const capturedEmails: Captured[] = []

export const resetEmails = () => {
  capturedEmails.length = 0
}

// Payload v3 expects `email` to be a function that returns the adapter config
// (same shape as resendAdapter: outer factory → inner () => configObject).
export const emailSpyAdapter = () =>
  () => ({
    name: 'spy',
    defaultFromAddress: 'spy@test.local',
    defaultFromName: 'Test',
    sendEmail: async (message: Captured) => {
      capturedEmails.push(message)
      return { id: `spy-${capturedEmails.length}` }
    },
  })
