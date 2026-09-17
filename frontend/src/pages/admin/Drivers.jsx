import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Driver accounts. Admin is the only way one gets created — there is no
 * driver self-signup (CLAUDE.md §10). Deactivating stops a driver signing in
 * and stops their existing session reaching driver routes.
 */
export default function Drivers() {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: api.drivers.list,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })

  const setActive = useMutation({
    mutationFn: ({ id, active }) => api.drivers.setActive(id, active),
    onSuccess: invalidate,
  })

  const drivers = data?.drivers ?? []

  return (
    <>
      <p className="eyebrow text-muted-foreground">Drivers</p>
      <h1 className="mt-4 text-[clamp(2rem,4vw,2.75rem)]">Delivery drivers</h1>
      <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
        Each driver signs in on their own phone at{' '}
        <span className="font-semibold text-foreground">/driver/login</span> and
        only
        sees orders assigned to them. Deactivating a driver blocks them
        immediately, including an already-open session.
      </p>

      <AddDriverForm onCreated={invalidate} />

      <div className="mt-8 overflow-hidden rounded-md border border-border bg-surface">
        {isPending ? (
          <p className="p-6 text-muted-foreground">Loading drivers…</p>
        ) : drivers.length === 0 ? (
          <p className="p-6 text-muted-foreground">
            No drivers yet — add the first one above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {drivers.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 p-5"
              >
                <div>
                  <p className="text-[15px] font-semibold">{d.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {d.email}
                    {d.phone ? ` · +91 ${d.phone}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'eyebrow rounded-sm px-2 py-1',
                      d.active
                        ? 'bg-primary/12 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {d.active ? 'Active' : 'Deactivated'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActive.mutate({ id: d.id, active: !d.active })
                    }
                    disabled={
                      setActive.isPending && setActive.variables?.id === d.id
                    }
                    className="rounded-full border border-border px-4 py-2 text-[13px] font-semibold transition-colors hover:border-primary/60 disabled:opacity-60"
                  >
                    {d.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function AddDriverForm({ onCreated }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  })

  const create = useMutation({
    mutationFn: api.drivers.create,
    onSuccess: () => {
      onCreated()
      setForm({ name: '', phone: '', email: '', password: '' })
    },
  })

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  return (
    <form
      className="mt-8 grid gap-4 rounded-md border border-border bg-surface p-6 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        create.mutate(form)
      }}
    >
      <h2 className="font-display text-[20px] sm:col-span-2">Add a driver</h2>

      <Field label="Name" id="driver-name" {...field('name')} />
      <Field
        label="Phone"
        id="driver-phone"
        inputMode="numeric"
        placeholder="9823011284"
        hint="10 digits, no +91 or spaces, starting 6–9"
        {...field('phone')}
      />
      <Field label="Email" id="driver-email" type="email" {...field('email')} />
      <Field
        label="Password"
        id="driver-password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters"
        {...field('password')}
      />

      {create.isError && (
        <div
          role="alert"
          className="text-[13px] text-destructive sm:col-span-2"
        >
          <p>
            {create.error instanceof ApiError
              ? create.error.message
              : 'Could not add that driver.'}
          </p>
          {create.error instanceof ApiError &&
            create.error.fields?.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {create.error.fields.map((f) => (
                  <li key={f.path}>
                    {f.path}: {f.message}
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}

      <button
        type="submit"
        disabled={create.isPending}
        className="mt-1 w-fit rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-dark disabled:opacity-60 sm:col-span-2"
      >
        {create.isPending ? 'Adding…' : 'Add driver'}
      </button>
    </form>
  )
}

function Field({ label, id, hint, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow block text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        required
        className="mt-2 w-full rounded-sm border border-border bg-background px-4 py-3 text-[15px] focus:border-primary"
        {...rest}
      />
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
