import { randomUUID } from 'node:crypto'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getFathomAuthUrl } from '@/server/fathom'

const SECURE = process.env.NODE_ENV === 'production'
const COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: SECURE,
  maxAge: 60 * 10,
} as const

export async function GET(req: Request) {
  const url = new URL(req.url)
  const returnTo = url.searchParams.get('return_to') ?? '/tokens'

  const clientId = url.searchParams.get('oauth_client_id')
  const redirectUri = url.searchParams.get('oauth_redirect_uri')
  const codeChallenge = url.searchParams.get('oauth_code_challenge')
  const state = url.searchParams.get('oauth_state') ?? ''

  const oauthState = randomUUID()

  const jar = await cookies()
  jar.set('fathom_oauth_state', oauthState, COOKIE_OPTS)
  jar.set('fathom_oauth_return', returnTo, COOKIE_OPTS)

  if (clientId && redirectUri && codeChallenge) {
    jar.set(
      'oauth_pending',
      JSON.stringify({ clientId, redirectUri, codeChallenge, state }),
      COOKIE_OPTS
    )
  }

  const authUrl = getFathomAuthUrl(oauthState)
  redirect(authUrl)
}

export const runtime = 'nodejs'
