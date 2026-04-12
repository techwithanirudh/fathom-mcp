import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { env } from '@/env'

const ALGORITHM = 'aes-256-gcm'
const AUTH_TAG_BYTES = 16
const IV_BYTES = 12
const REQUIRED_KEY_BYTES = 32

const getEncryptionKey = () => {
  const key = Buffer.from(env.APP_ENCRYPTION_KEY, 'base64')

  if (key.length !== REQUIRED_KEY_BYTES) {
    throw new Error('APP_ENCRYPTION_KEY must decode to exactly 32 bytes.')
  }

  return key
}

export const encryptSecret = (value: string) => {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag().subarray(0, AUTH_TAG_BYTES)

  return [iv, authTag, encrypted]
    .map((chunk) => chunk.toString('base64url'))
    .join('.')
}

export const decryptSecret = (payload: string) => {
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split('.')

  if (!(ivBase64 && authTagBase64 && encryptedBase64)) {
    throw new Error('Encrypted payload is malformed.')
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivBase64, 'base64url')
  )
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64url'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64url')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
