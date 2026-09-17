/**
 * Prints a bcrypt hash for ADMIN_PASSWORD_HASH / CHEF_PASSWORD_HASH.
 *
 *   npm run hash-password            # prompts, input hidden
 *   echo -n 'secret' | npm run hash-password --silent
 *
 * The plain password is never written anywhere — keep it in a password manager
 * and paste only the printed line into backend/.env (or your host's env
 * settings), then restart the server.
 */
import bcrypt from 'bcryptjs'

const MIN_LENGTH = 12
const COST = 12

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process
    stdout.write(prompt)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''
    stdin.on('data', function onData(chunk) {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off('data', onData)
          stdout.write('\n')
          return resolve(value)
        }
        if (ch === '') {
          stdin.setRawMode(false)
          return reject(new Error('cancelled'))
        }
        if (ch === '' || ch === '\b') value = value.slice(0, -1)
        else value += ch
      }
    })
  })
}

async function readPiped() {
  let data = ''
  for await (const chunk of process.stdin) data += chunk
  return data.replace(/\r?\n$/, '')
}

async function main() {
  let password
  if (process.stdin.isTTY) {
    password = await readHidden('Password: ')
    const again = await readHidden('Repeat:   ')
    if (password !== again) throw new Error('Passwords did not match.')
  } else {
    password = await readPiped()
  }

  if (password.length < MIN_LENGTH) {
    throw new Error(`Use at least ${MIN_LENGTH} characters.`)
  }

  const hash = await bcrypt.hash(password, COST)
  console.log(`\nPaste into backend/.env (single quotes keep the $ signs literal):\n`)
  console.log(`'${hash}'`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
