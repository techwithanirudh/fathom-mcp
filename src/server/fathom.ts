import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { Fathom } from 'fathom-typescript'
import type { Meeting } from 'fathom-typescript/sdk/models/shared/meeting'

import { env } from '@/env'
import { decrypt, encrypt } from './auth/crypto'
import { db } from './db'
import { fathomTokens, users } from './db/schema'

class DbTokenStore {
  private readonly userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async get() {
    const [row] = await db
      .select()
      .from(fathomTokens)
      .where(eq(fathomTokens.userId, this.userId))
      .limit(1)

    if (!row) {
      return { token: '', refresh_token: '', expires: 0 }
    }

    return {
      token: decrypt(row.accessTokenEnc),
      refresh_token: decrypt(row.refreshTokenEnc),
      expires: Math.floor(row.accessTokenExpiresAt.getTime() / 1000),
    }
  }

  async set(token: string, refresh_token: string, expires: number) {
    await db
      .update(fathomTokens)
      .set({
        accessTokenEnc: encrypt(token),
        refreshTokenEnc: encrypt(refresh_token),
        accessTokenExpiresAt: new Date(expires * 1000),
        updatedAt: new Date(),
      })
      .where(eq(fathomTokens.userId, this.userId))
  }
}

const callbackUrl = () =>
  new URL(
    '/api/integrations/fathom/callback',
    env.NEXT_PUBLIC_BASE_URL
  ).toString()

export const getFathomAuthUrl = (state: string) =>
  Fathom.getAuthorizationUrl({
    clientId: env.FATHOM_CLIENT_ID,
    redirectUri: callbackUrl(),
    scope: 'public_api',
    state,
  })

export const createFathomClient = (userId: string) =>
  new Fathom({
    security: Fathom.withAuthorization({
      clientId: env.FATHOM_CLIENT_ID,
      clientSecret: env.FATHOM_CLIENT_SECRET,
      code: '',
      redirectUri: callbackUrl(),
      tokenStore: new DbTokenStore(userId),
    }),
  })

export const initFathomOAuth = (code: string) => {
  const tempStore = Fathom.newTokenStore()
  const client = new Fathom({
    security: Fathom.withAuthorization({
      clientId: env.FATHOM_CLIENT_ID,
      clientSecret: env.FATHOM_CLIENT_SECRET,
      code,
      redirectUri: callbackUrl(),
      tokenStore: tempStore,
    }),
  })
  return { client, tempStore }
}

export const saveFathomTokens = async (
  userId: string,
  tempStore: ReturnType<typeof Fathom.newTokenStore>,
  recorderEmail: string | null
) => {
  const stored = await tempStore.get()
  if (!stored) {
    throw new Error('Fathom code exchange did not produce tokens.')
  }

  const now = new Date()

  await db
    .insert(fathomTokens)
    .values({
      id: randomUUID(),
      userId,
      accessTokenEnc: encrypt(stored.token),
      refreshTokenEnc: encrypt(stored.refresh_token),
      accessTokenExpiresAt: new Date(stored.expires * 1000),
      recorderEmail,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: fathomTokens.userId,
      set: {
        accessTokenEnc: encrypt(stored.token),
        refreshTokenEnc: encrypt(stored.refresh_token),
        accessTokenExpiresAt: new Date(stored.expires * 1000),
        recorderEmail,
        updatedAt: now,
      },
    })
}

export const inferWorkspaceFromMeetings = (meetings: Meeting[]) => {
  const freq = new Map<string, { count: number; email: string; name: string }>()

  for (const m of meetings) {
    const key = m.recordedBy.email.toLowerCase()
    const cur = freq.get(key)
    freq.set(key, {
      count: (cur?.count ?? 0) + 1,
      email: m.recordedBy.email,
      name: m.recordedBy.name,
    })
  }

  const top = [...freq.values()].sort((a, b) => b.count - a.count)[0]

  if (!top) {
    return { email: null, workspaceName: 'Fathom workspace' }
  }

  const first = top.name.split(' ')[0] ?? 'Fathom'
  return { email: top.email, workspaceName: `${first}'s workspace` }
}

export const getFathomBearerToken = async (userId: string) => {
  const tokenStore = new DbTokenStore(userId)
  const getToken = Fathom.withAuthorization({
    clientId: env.FATHOM_CLIENT_ID,
    clientSecret: env.FATHOM_CLIENT_SECRET,
    code: '',
    redirectUri: callbackUrl(),
    tokenStore,
  })
  const security = await getToken()
  if (!security.bearerAuth) {
    throw new Error('No bearer token available for user.')
  }
  return security.bearerAuth
}

export const findUserByEmail = async (email: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailHint, email))
    .limit(1)
  return user ?? null
}
