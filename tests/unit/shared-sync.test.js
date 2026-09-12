import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * shared/index.js is duplicated into frontend/src/shared/ and
 * backend/src/shared/ so each package is deployable on its own (no sibling
 * folder needed at build time — see scripts/sync-shared.mjs). This test is
 * the safety net for that duplication: if someone edits a copy directly, or
 * edits the canonical file and forgets to run `npm run sync-shared`, this
 * fails loudly instead of the two packages silently disagreeing about
 * validation.
 */
describe('shared/ duplication stays in sync', () => {
  const canonical = readFileSync(
    new URL('../../shared/index.js', import.meta.url),
    'utf8',
  )

  it('frontend/src/shared/index.js matches the canonical source', () => {
    const copy = readFileSync(
      new URL('../../frontend/src/shared/index.js', import.meta.url),
      'utf8',
    )
    expect(copy).toBe(canonical)
  })

  it('backend/src/shared/index.js matches the canonical source', () => {
    const copy = readFileSync(
      new URL('../../backend/src/shared/index.js', import.meta.url),
      'utf8',
    )
    expect(copy).toBe(canonical)
  })
})
