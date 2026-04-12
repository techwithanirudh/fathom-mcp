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

class DbTokenStore {
  private readonly userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async get() {
    const [connection] = await db
      .select()
      .from(fathomConnections)
      .where(eq(fathomConnections.userId, this.userId))
      .limit(1)

    if (!connection) {
      return {
        token: '',
        refresh_token: '',
        expires: 0,
      }
    }

    return {
      token: decryptSecret(connection.accessTokenEncrypted),
      refresh_token: decryptSecret(connection.refreshTokenEncrypted),
      expires: Math.floor(connection.accessTokenExpiresAt.getTime() / 1000),
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

export const createFathomClient = (userId: string) => {
  const tokenStore = new DbTokenStore(userId)

  return new Fathom({
    security: Fathom.withAuthorization({
      clientId: env.FATHOM_CLIENT_ID,
      clientSecret: env.FATHOM_CLIENT_SECRET,
      code: '',
      redirectUri: getFathomCallbackUrl(),
      tokenStore,
    }),
  })
}

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
  metadata?: {
    emailHint?: string | null
    recorderName?: string | null
  }
) => {
  const stored = await tempStore.get()

  if (!stored) {
    throw new Error(
      'No OAuth tokens were stored. The Fathom code exchange did not complete.'
    )
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

export const inferWorkspaceFromMeetings = (meetings: Meeting[]) => {
  const frequency = new Map<
    string,
    { count: number; email: string; name: string }
  >()

  for (const meeting of meetings) {
    const key = meeting.recordedBy.email.toLowerCase()
    const current = frequency.get(key)

    frequency.set(key, {
      count: (current?.count ?? 0) + 1,
      email: meeting.recordedBy.email,
      name: meeting.recordedBy.name,
    })
  }

  const primary = Array.from(frequency.values()).sort(
    (left, right) => right.count - left.count
  )[0]

  if (!primary) {
    return {
      emailHint: null,
      recorderName: null,
      workspaceName: 'Fathom workspace',
    }
  }

  const firstName = primary.name.split(' ')[0] ?? 'Fathom'

  return {
    emailHint: primary.email,
    recorderName: primary.name,
    workspaceName: `${firstName}'s Fathom desk`,
  }
}

export const findExistingUserForMeetings = async (meetings: Meeting[]) => {
  const inferred = inferWorkspaceFromMeetings(meetings)

  if (!inferred.emailHint) {
    return null
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailHint, inferred.emailHint))
    .limit(1)

  return user ?? null
}
