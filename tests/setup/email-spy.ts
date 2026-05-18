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

// Payload v3 expects `email` to be a function ({ payload }) => adapterObject,
// matching the shape that resendAdapter(args) returns (an adapter factory function).
// So emailSpyAdapter() returns a function — the outer call gives the factory,
// the inner function is what Payload calls at init time to get the adapter object.
// Note: the "No email adapter" warning in test output comes from the `payload migrate`
// subprocess (global-setup.ts) which uses the real config with no RESEND_API_KEY set —
// it does NOT indicate that this spy is unwired in the test Payload instance.
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
