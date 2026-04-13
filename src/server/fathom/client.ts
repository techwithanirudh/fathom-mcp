import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { Fathom } from 'fathom-typescript'
import type { Meeting } from 'fathom-typescript/sdk/models/shared/meeting'

import { env } from '@/env'
import { decryptSecret, encryptSecret } from '@/server/crypto'
import { db } from '@/server/db'
import { fathomConnections, users } from '@/server/db/schema'

type TempTokenStore = ReturnType<typeof Fathom.newTokenStore>

const CALLBACK_PATH = '/api/integrations/fathom/callback'

export const getFathomCallbackUrl = () =>
  new URL(CALLBACK_PATH, env.NEXT_PUBLIC_BASE_URL).toString()

export const buildFathomAuthorizationUrl = (state: string) =>
  Fathom.getAuthorizationUrl({
    clientId: env.FATHOM_CLIENT_ID,
    redirectUri: getFathomCallbackUrl(),
    scope: 'public_api',
    state,
  })

// Token store backed by the database (encrypted at rest)
class DbTokenStore {
  private readonly userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async get() {
    const [row] = await db
      .select()
      .from(fathomConnections)
      .where(eq(fathomConnections.userId, this.userId))
      .limit(1)

    if (!row) {
      return { token: '', refresh_token: '', expires: 0 }
    }

    return {
      token: decryptSecret(row.accessTokenEncrypted),
      refresh_token: decryptSecret(row.refreshTokenEncrypted),
      expires: Math.floor(row.accessTokenExpiresAt.getTime() / 1000),
    }
  }

  async set(token: string, refresh_token: string, expires: number) {
    await db
      .update(fathomConnections)
      .set({
        accessTokenEncrypted: encryptSecret(token),
        refreshTokenEncrypted: encryptSecret(refresh_token),
        accessTokenExpiresAt: new Date(expires * 1000),
        updatedAt: new Date(),
      })
      .where(eq(fathomConnections.userId, this.userId))
  }
}

export const createFathomClient = (userId: string) =>
  new Fathom({
    security: Fathom.withAuthorization({
      clientId: env.FATHOM_CLIENT_ID,
      clientSecret: env.FATHOM_CLIENT_SECRET,
      code: '',
      redirectUri: getFathomCallbackUrl(),
      tokenStore: new DbTokenStore(userId),
    }),
  })

export const initOAuthClient = (code: string) => {
  const tempStore = Fathom.newTokenStore()

  const client = new Fathom({
    security: Fathom.withAuthorization({
      clientId: env.FATHOM_CLIENT_ID,
      clientSecret: env.FATHOM_CLIENT_SECRET,
      code,
      redirectUri: getFathomCallbackUrl(),
      tokenStore: tempStore,
    }),
  })

  return { client, tempStore }
}

export const persistOAuthTokens = async (
  userId: string,
  tempStore: TempTokenStore,
  metadata?: { emailHint?: string | null; recorderName?: string | null }
) => {
  const stored = await tempStore.get()

  if (!stored) {
    throw new Error('No OAuth tokens were stored after code exchange.')
  }

  const now = new Date()

  await db
    .insert(fathomConnections)
    .values({
      id: randomUUID(),
      userId,
      accessTokenEncrypted: encryptSecret(stored.token),
      refreshTokenEncrypted: encryptSecret(stored.refresh_token),
      accessTokenExpiresAt: new Date(stored.expires * 1000),
      inferredRecorderEmail: metadata?.emailHint ?? null,
      inferredRecorderName: metadata?.recorderName ?? null,
      scope: 'public_api',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: fathomConnections.userId,
      set: {
        accessTokenEncrypted: encryptSecret(stored.token),
        refreshTokenEncrypted: encryptSecret(stored.refresh_token),
        accessTokenExpiresAt: new Date(stored.expires * 1000),
        inferredRecorderEmail: metadata?.emailHint ?? null,
        inferredRecorderName: metadata?.recorderName ?? null,
        scope: 'public_api',
        updatedAt: now,
      },
    })
}

// Infer workspace identity from the meeting list (most frequent recorder)
export const inferWorkspace = (meetings: Meeting[]) => {
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
    return {
      emailHint: null,
      recorderName: null,
      workspaceName: 'Fathom workspace',
    }
  }

  const first = top.name.split(' ')[0] ?? 'Fathom'
  return {
    emailHint: top.email,
    recorderName: top.name,
    workspaceName: `${first}'s workspace`,
  }
}

// Returns the current access token for direct API calls (outside the SDK).
// The Fathom SDK handles refresh automatically for SDK-driven calls.
export const getFathomAccessToken = async (userId: string) => {
  const [row] = await db
    .select()
    .from(fathomConnections)
    .where(eq(fathomConnections.userId, userId))
    .limit(1)

  if (!row) {
    throw new Error('No Fathom connection found for this user.')
  }

  return decryptSecret(row.accessTokenEncrypted)
}

export const findUserByEmail = async (emailHint: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailHint, emailHint))
    .limit(1)

  return user ?? null
}
