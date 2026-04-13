import { randomUUID } from 'node:crypto'

import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase64urlNoPadding } from '@oslojs/encoding'
import { and, eq, gt, isNull } from 'drizzle-orm'

import { db } from '../db'
import { oauthClients, oauthCodes } from '../db/schema'

const CODE_TTL_MS = 10 * 60 * 1000

export const registerClient = async (input: {
  name?: string
  uri?: string
  redirectUris: string[]
}) => {
  const id = randomUUID()

  await db.insert(oauthClients).values({
    id,
    name: input.name ?? null,
    uri: input.uri ?? null,
    redirectUris: JSON.stringify(input.redirectUris),
  })

  return id
}

export const getClient = async (clientId: string) => {
  const [row] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.id, clientId))
    .limit(1)

  if (!row) {
    return null
  }

  return {
    id: row.id,
    name: row.name,
    uri: row.uri,
    redirectUris: JSON.parse(row.redirectUris) as string[],
  }
}

const randomCode = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return encodeBase64urlNoPadding(bytes)
}

export const createCode = async (params: {
  clientId: string
  userId: string
  redirectUri: string
  codeChallenge: string
}) => {
  const code = randomCode()

  await db.insert(oauthCodes).values({
    id: code,
    clientId: params.clientId,
    userId: params.userId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  })

  return code
}

export const redeemCode = async (params: {
  code: string
  clientId: string
  redirectUri: string
  codeVerifier: string
}) => {
  const [row] = await db
    .select()
    .from(oauthCodes)
    .where(
      and(
        eq(oauthCodes.id, params.code),
        eq(oauthCodes.clientId, params.clientId),
        eq(oauthCodes.redirectUri, params.redirectUri),
        isNull(oauthCodes.usedAt),
        gt(oauthCodes.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!row) {
    return null
  }

  await db
    .update(oauthCodes)
    .set({ usedAt: new Date() })
    .where(eq(oauthCodes.id, params.code))

  const expected = encodeBase64urlNoPadding(
    sha256(new TextEncoder().encode(params.codeVerifier))
  )

  if (expected !== row.codeChallenge) {
    return null
  }

  return row.userId
}
