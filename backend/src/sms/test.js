/**
 * Development and test provider: sends nothing, and the code is always
 * TEST_OTP_CODE so tests (and a developer at checkout) can type it in.
 * config.js refuses to start with this provider in production.
 */
export const TEST_OTP_CODE = '123456'

export const testProvider = {
  fixedCode: TEST_OTP_CODE,
  async sendOtp(phone, code) {
    console.log(`[sms:test] code for ${phone} is ${code} (not sent)`)
  },
}
