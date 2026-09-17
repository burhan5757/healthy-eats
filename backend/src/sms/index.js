import { config } from '../config.js'
import { testProvider } from './test.js'

/**
 * Provider-neutral SMS sending (CLAUDE.md §23). Each provider is one adapter
 * exposing `sendOtp(phone, code)` and, optionally, `fixedCode` for providers
 * that must not use a random code (the test provider). To add a real one
 * (MSG91, Twilio, …): write an adapter file, register it here, and add its
 * name to SMS_PROVIDERS in config.js.
 */
const providers = {
  test: testProvider,
}

export function smsProvider() {
  const provider = providers[config.sms.provider]
  if (!provider) {
    throw new Error(`No SMS provider named "${config.sms.provider}"`)
  }
  return provider
}
