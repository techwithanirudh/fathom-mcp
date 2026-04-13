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

export const findUserByEmail = async (email: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailHint, email))
    .limit(1)
  return user ?? null
}

const OAUTH_TOKEN_URL = 'https://fathom.video/external/v1/oauth2/token'
const ACCESS_TOKEN_TOLERANCE_SECONDS = 5 * 60

const getStoredTokens = async (userId: string) => {
  const [row] = await db
    .select()
    .from(fathomTokens)
    .where(eq(fathomTokens.userId, userId))
    .limit(1)

  if (!row) {
    throw new Error('No stored Fathom OAuth tokens found for this user.')
  }

  return row
}

const persistRefreshedTokens = async (params: {
  accessToken: string
  expiresIn: number
  refreshToken: string
  userId: string
}) => {
  await db
    .update(fathomTokens)
    .set({
      accessTokenEnc: encrypt(params.accessToken),
      refreshTokenEnc: encrypt(params.refreshToken),
      accessTokenExpiresAt: new Date(
        (Date.now() / 1000 +
          params.expiresIn -
          ACCESS_TOKEN_TOLERANCE_SECONDS) *
          1000
      ),
      updatedAt: new Date(),
    })
    .where(eq(fathomTokens.userId, params.userId))
}

export const getValidAccessToken = async (userId: string) => {
  const row = await getStoredTokens(userId)

  if (row.accessTokenExpiresAt.getTime() > Date.now()) {
    return decrypt(row.accessTokenEnc)
  }

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.FATHOM_CLIENT_ID,
      client_secret: env.FATHOM_CLIENT_SECRET,
      refresh_token: decrypt(row.refreshTokenEnc),
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to refresh Fathom OAuth token (${response.status}).`
    )
  }

  const json = (await response.json()) as {
    access_token?: string
    expires_in?: number
    refresh_token?: string
  }

  if (!(json.access_token && json.refresh_token && json.expires_in)) {
    throw new Error('Fathom token refresh returned an invalid payload.')
  }

  await persistRefreshedTokens({
    accessToken: json.access_token,
    expiresIn: json.expires_in,
    refreshToken: json.refresh_token,
    userId,
  })

  return json.access_token
}

export const getRecordingTranscript = async (
  userId: string,
  recordingId: number
) => {
  const accessToken = await getValidAccessToken(userId)
  const url = new URL(
    `/external/v1/recordings/${recordingId}/transcript`,
    'https://api.fathom.ai'
  )

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch transcript for recording ${recordingId} (${response.status}).`
    )
  }

  return (await response.json()) as {
    transcript?: Array<{
      speaker: {
        displayName: string
        matchedCalendarInviteeEmail?: string | null
      }
      text: string
      timestamp: string
    }>
  }
}
