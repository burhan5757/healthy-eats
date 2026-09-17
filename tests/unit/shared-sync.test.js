import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * frontend/src/shared/index.js and backend/src/shared/index.js are two committed
 * copies of the same contract, kept separate so each package deploys on its own.
 * There is no canonical third copy: edit one, copy it over the other.
 * This fails loudly if the two ever disagree about validation.
 */
describe('frontend and backend shared contracts stay identical', () => {
  it('frontend/src/shared/index.js matches backend/src/shared/index.js', () => {
    const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
    expect(read('../../frontend/src/shared/index.js')).toBe(
      read('../../backend/src/shared/index.js'),
    )
  })
})
