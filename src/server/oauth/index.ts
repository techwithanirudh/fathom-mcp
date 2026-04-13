import { randomUUID } from 'node:crypto'

import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase64urlNoPadding } from '@oslojs/encoding'
import { and, eq, gt, isNull } from 'drizzle-orm'

import { db } from '@/server/db'
import { oauthClients, oauthCodes } from '@/server/db/schema'

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ─── Clients ─────────────────────────────────────────────────────────────────

export interface ClientInput {
  clientName?: string
  clientUri?: string
  grantTypes?: string[]
  redirectUris: string[]
  tokenEndpointAuthMethod?: string
}

export const createClient = async (input: ClientInput) => {
  const id = randomUUID()

  await db.insert(oauthClients).values({
    id,
    clientName: input.clientName ?? null,
    clientUri: input.clientUri ?? null,
    redirectUris: JSON.stringify(input.redirectUris),
    grantTypes: JSON.stringify(input.grantTypes ?? ['authorization_code']),
    tokenEndpointAuthMethod: input.tokenEndpointAuthMethod ?? 'none',
  })

  return id
}

export const findClient = async (clientId: string) => {
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
    clientName: row.clientName,
    clientUri: row.clientUri,
    redirectUris: JSON.parse(row.redirectUris) as string[],
    grantTypes: JSON.parse(row.grantTypes) as string[],
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
  }
}

export const isRedirectUriAllowed = (registered: string[], requested: string) =>
  registered.includes(requested)

// ─── Authorization codes ──────────────────────────────────────────────────────

const generateCode = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return encodeBase64urlNoPadding(bytes)
}

export const createCode = async (params: {
  clientId: string
  userId: string
  redirectUri: string
  codeChallenge: string | null
  codeChallengeMethod: string | null
  scopes: string[]
}) => {
  const code = generateCode()

  await db.insert(oauthCodes).values({
    id: code,
    clientId: params.clientId,
    userId: params.userId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    scopes: JSON.stringify(params.scopes),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  })

  return code
}

export const redeemCode = async (
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string | null
) => {
  const [row] = await db
    .select()
    .from(oauthCodes)
    .where(
      and(
        eq(oauthCodes.id, code),
        eq(oauthCodes.clientId, clientId),
        eq(oauthCodes.redirectUri, redirectUri),
        isNull(oauthCodes.usedAt),
        gt(oauthCodes.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!row) {
    return null
  }

  // Mark used immediately to prevent replay
  await db
    .update(oauthCodes)
    .set({ usedAt: new Date() })
    .where(eq(oauthCodes.id, code))

  // Verify PKCE
  if (row.codeChallenge) {
    if (!codeVerifier) {
      return null
    }

    const expected = encodeBase64urlNoPadding(
      sha256(new TextEncoder().encode(codeVerifier))
    )

    if (expected !== row.codeChallenge) {
      return null
    }
  }

  return {
    userId: row.userId,
    scopes: JSON.parse(row.scopes) as string[],
  }
}
