import { randomUUID } from 'node:crypto'

import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase64urlNoPadding, encodeHexLowerCase } from '@oslojs/encoding'
import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { db } from '@/server/db'
import { sessions, users } from '@/server/db/schema'

export const SESSION_COOKIE_NAME = 'fathom-mcp.session'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30

const hashToken = (token: string) =>
  encodeHexLowerCase(sha256(new TextEncoder().encode(token)))

const generateToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return encodeBase64urlNoPadding(bytes)
}

const getCookieConfig = (expiresAt: Date) => ({
  expires: expiresAt,
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
})

export const createSession = async (userId: string) => {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, getCookieConfig(expiresAt))
}

export const clearSession = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

export const getSession = cache(async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  const [result] = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1)

  return result ?? null
})
