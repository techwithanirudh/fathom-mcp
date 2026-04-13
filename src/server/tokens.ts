import { randomUUID } from 'node:crypto'

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase64urlNoPadding, encodeHexLowerCase } from '@oslojs/encoding'
import { and, eq } from 'drizzle-orm'

import { db } from './db'
import { mcpTokens } from './db/schema'

const hashToken = (token: string) =>
  encodeHexLowerCase(sha256(new TextEncoder().encode(token)))

const randomToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `mcp_${encodeBase64urlNoPadding(bytes)}`
}

export const createToken = async (
  userId: string,
  label: string,
  clientId?: string
) => {
  const raw = randomToken()

  await db.insert(mcpTokens).values({
    id: randomUUID(),
    userId,
    clientId: clientId ?? null,
    label,
    tokenHash: hashToken(raw),
  })

  return raw
}

export const verifyToken = async (
  raw: string
): Promise<AuthInfo | undefined> => {
  const hash = hashToken(raw)

  const [row] = await db
    .select()
    .from(mcpTokens)
    .where(eq(mcpTokens.tokenHash, hash))
    .limit(1)

  if (!row) {
    return undefined
  }

  await db
    .update(mcpTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(mcpTokens.id, row.id))

  return {
    token: raw,
    clientId: row.clientId ?? '',
    scopes: [],
    extra: { userId: row.userId },
  }
}

export const listTokens = async (userId: string) =>
  db.select().from(mcpTokens).where(eq(mcpTokens.userId, userId))

export const deleteToken = async (id: string, userId: string) => {
  await db
    .delete(mcpTokens)
    .where(and(eq(mcpTokens.id, id), eq(mcpTokens.userId, userId)))
}
