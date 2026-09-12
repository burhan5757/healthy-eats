#!/usr/bin/env node
// Copies the canonical shared/index.js into frontend/src/shared/ and
// backend/src/shared/ so each package is a self-contained deployable unit —
// a host that only checks out frontend/ or backend/ (Vercel, Render, Railway,
// etc.) never needs the sibling shared/ folder or a monorepo build step.
//
// shared/index.js is the ONLY copy meant to be hand-edited. Run this script
// (or `npm run sync-shared`) after every edit to it, before committing — the
// two package copies are committed as regular files precisely so a deploy
// never has to run this script itself.
//
// `npm run verify-shared-sync` (or the equivalent Vitest check in
// tests/unit/shared-sync.test.js) catches a forgotten sync or a hand-edited
// copy by comparing file contents byte-for-byte.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
)
const canonical = path.join(repoRoot, 'shared', 'index.js')
const targets = [
  path.join(repoRoot, 'frontend', 'src', 'shared', 'index.js'),
  path.join(repoRoot, 'backend', 'src', 'shared', 'index.js'),
]

const source = readFileSync(canonical, 'utf8')
for (const target of targets) {
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, source, 'utf8')
  console.log(`synced -> ${path.relative(repoRoot, target)}`)
}
