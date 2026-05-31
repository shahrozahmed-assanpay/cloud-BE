import bcrypt from 'bcryptjs'
import { argon2idAsync } from '@noble/hashes/argon2.js'

const ARGON2ID_DEFAULTS = {
  m: 65536,
  t: 2,
  p: 1,
  dkLen: 32,
} as const

export async function hashToken(value: string) {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )

  return Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function hashPassword(password: string) {
  const salt = new Uint8Array(32)
  crypto.getRandomValues(salt)

  const hash = await argon2idAsync(password, salt, ARGON2ID_DEFAULTS)

  return [
    '$argon2id',
    '$v=19',
    `$m=${ARGON2ID_DEFAULTS.m},t=${ARGON2ID_DEFAULTS.t},p=${ARGON2ID_DEFAULTS.p}`,
    `$${toBase64NoPadding(salt)}`,
    `$${toBase64NoPadding(hash)}`,
  ].join('')
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith('$argon2id$')) {
    return verifyArgon2idPassword(password, passwordHash)
  }

  if (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$')) {
    return bcrypt.compare(password, passwordHash)
  }

  return false
}

function toBase64NoPadding(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64').replace(/=+$/u, '')
}

function fromBase64NoPadding(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  return new Uint8Array(Buffer.from(padded, 'base64'))
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }

  return diff === 0
}

async function verifyArgon2idPassword(password: string, passwordHash: string) {
  const [, algorithm, versionField, paramsField, saltField, hashField] =
    passwordHash.split('$')

  if (
    algorithm !== 'argon2id' ||
    versionField !== 'v=19' ||
    !paramsField ||
    !saltField ||
    !hashField
  ) {
    return false
  }

  const params = Object.fromEntries(
    paramsField.split(',').map((entry) => {
      const [key, value] = entry.split('=')
      return [key, Number(value)]
    }),
  )

  if (!params.m || !params.t || !params.p) {
    return false
  }

  const expectedHash = fromBase64NoPadding(hashField)
  const actualHash = await argon2idAsync(password, fromBase64NoPadding(saltField), {
    m: params.m,
    t: params.t,
    p: params.p,
    dkLen: expectedHash.length,
  })

  return timingSafeEqual(actualHash, expectedHash)
}
