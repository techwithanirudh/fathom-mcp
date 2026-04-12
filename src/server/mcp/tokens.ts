import { randomUUID } from 'node:crypto'

import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase64urlNoPadding, encodeHexLowerCase } from '@oslojs/encoding'
import { and, eq, gt, isNull, or } from 'drizzle-orm'

import { db } from '@/server/db'
import { fathomConnections, mcpTokens, users } from '@/server/db/schema'

const TOKEN_PREFIX = 'fmcp_'

const hashToken = (token: string) =>
  encodeHexLowerCase(sha256(new TextEncoder().encode(token)))

const generateRawToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return `${TOKEN_PREFIX}${encodeBase64urlNoPadding(bytes)}`
}

export const createMcpToken = async (userId: string, label: string) => {
  const token = generateRawToken()

  await db.insert(mcpTokens).values({
    id: randomUUID(),
    userId,
    label,
    tokenHash: hashToken(token),
  })

  return token
}

export const verifyMcpToken = async (
  token: string | undefined
): Promise<AuthInfo | undefined> => {
  if (!token) {
    return undefined
  }

  const [result] = await db
    .select({
      token: mcpTokens,
      user: users,
      connection: fathomConnections,
    })
    .from(mcpTokens)
    .innerJoin(users, eq(mcpTokens.userId, users.id))
    .innerJoin(
      fathomConnections,
      eq(mcpTokens.userId, fathomConnections.userId)
    )
    .where(
      and(
        eq(mcpTokens.tokenHash, hashToken(token)),
        or(isNull(mcpTokens.expiresAt), gt(mcpTokens.expiresAt, new Date()))
      )
    )
    .limit(1)

  if (!result) {
    return undefined
  }

  await db
    .update(mcpTokens)
    .set({
      lastUsedAt: new Date(),
    })
    .where(eq(mcpTokens.id, result.token.id))

  return {
    clientId: result.token.id,
    extra: {
      label: result.token.label,
      userId: result.user.id,
      workspaceName: result.user.workspaceName,
    },
    scopes: ['mcp'],
    token,
  }
}
