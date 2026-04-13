/**
 * Session management for the management UI.
 *
 * Sessions are cookie-based. The cookie holds a random token; the database
 * holds its SHA-256 hash (so a compromised DB doesn't leak valid sessions).
 */

import { randomUUID } from 'node:crypto'

import { sha256 } from '@oslojs/crypto/sha2'
import { encodeBase64urlNoPadding, encodeHexLowerCase } from '@oslojs/encoding'
import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { db } from '../db'
import { sessions, users } from '../db/schema'

const COOKIE_NAME = 'mcp.session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const hashToken = (token: string) =>
  encodeHexLowerCase(sha256(new TextEncoder().encode(token)))

const makeToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return encodeBase64urlNoPadding(bytes)
}

export const createSession = async (userId: string) => {
  const token = makeToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  })

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    expires: expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export const clearSession = async () => {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  } else {
    // nothing to delete from DB
  }

  jar.delete(COOKIE_NAME)
}

// cache() deduplicates calls within a single request.
export const getSession = cache(async () => {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1)

  return row ?? null
})
