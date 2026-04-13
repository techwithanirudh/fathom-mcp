import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { env } from '@/env'

const ALGORITHM = 'aes-256-gcm'

const getKey = () => {
  const key = Buffer.from(env.APP_ENCRYPTION_KEY, 'base64')
  if (key.length !== 32) {
    throw new Error(
      'APP_ENCRYPTION_KEY must base64-decode to exactly 32 bytes.'
    )
  }
  return key
}

export const encrypt = (plaintext: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return [iv, authTag, ciphertext].map((b) => b.toString('base64url')).join('.')
}

export const decrypt = (payload: string): string => {
  const parts = payload.split('.')
  if (parts.length !== 3) {
    throw new Error('Encrypted payload is malformed.')
  }
  const [iv, authTag, ciphertext] = parts.map((p) =>
    Buffer.from(p, 'base64url')
  )
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')
}
