import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CircleCheck } from 'lucide-react'
import { OTP_LENGTH, addressSchema } from '@shared/index'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Proves the checkout phone number is real before the kitchen cooks for it
 * (CLAUDE.md §23): text a code, type it back, get a short-lived token that
 * the order is placed with. Changing the number starts over.
 */
export function PhoneVerification({ phone, verified, onVerified, error }) {
  const [sentTo, setSentTo] = useState(null)
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const phoneValid = addressSchema.shape.phone.safeParse(phone).success
  const isVerified = verified?.phone === phone
  const codeSent = sentTo === phone
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))

  // Tick only while a resend countdown is showing.
  useEffect(() => {
    if (waitSeconds <= 0) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [waitSeconds])

  const send = useMutation({
    mutationFn: () => api.otp.send(phone),
    onSuccess: (res) => {
      setSentTo(phone)
      setCode('')
      setNow(Date.now())
      setResendAt(Date.now() + res.resendInSeconds * 1000)
    },
    onError: (err) => {
      const retry = err instanceof ApiError ? err.body?.retryAfterSeconds : null
      if (retry) {
        setNow(Date.now())
        setResendAt(Date.now() + retry * 1000)
      }
    },
  })

  const verify = useMutation({
    mutationFn: () => api.otp.verify(phone, code),
    onSuccess: ({ phoneToken }) => onVerified({ phone, token: phoneToken }),
  })

  if (isVerified) {
    return (
      <p className="flex items-center gap-2 text-[13px] font-semibold text-primary">
        <CircleCheck className="size-4" strokeWidth={2} aria-hidden />
        Phone number verified
      </p>
    )
  }

  const problem =
    (send.isError && send.error.message) ||
    (verify.isError && verify.error.message) ||
    error

  return (
    <div className="rounded-sm border border-border bg-background p-4">
      <p className="text-[13px] text-muted-foreground">
        {codeSent
          ? `We texted a ${OTP_LENGTH}-digit code to ${phone}.`
          : 'We text you a code to confirm the number before the kitchen starts cooking.'}
      </p>

      {codeSent && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="otp"
              className="eyebrow block text-muted-foreground"
            >
              Code
            </label>
            <input
              id="otp"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
              }
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="000000"
              className="mt-2 w-36 rounded-sm border border-border bg-surface px-4 py-2.5 text-[15px] tracking-[0.2em] tabular-nums focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={() => verify.mutate()}
            disabled={code.length !== OTP_LENGTH || verify.isPending}
            className="rounded-full bg-primary px-6 py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark disabled:opacity-50"
          >
            {verify.isPending ? 'Checking…' : 'Verify'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => send.mutate()}
        disabled={!phoneValid || send.isPending || waitSeconds > 0}
        className={cn(
          'mt-3 text-[13px] font-semibold disabled:opacity-50',
          codeSent
            ? 'text-muted-foreground underline underline-offset-4'
            : 'rounded-full border border-primary/45 px-4 py-2 text-primary transition-colors duration-200 hover:bg-primary hover:text-primary-foreground',
        )}
      >
        {send.isPending
          ? 'Sending…'
          : waitSeconds > 0
            ? `Send again in ${waitSeconds}s`
            : codeSent
              ? 'Send a new code'
              : 'Text me a code'}
      </button>

      {!phoneValid && !codeSent && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Enter your 10-digit mobile number first.
        </p>
      )}
      {problem && (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          {problem}
        </p>
      )}
    </div>
  )
}
