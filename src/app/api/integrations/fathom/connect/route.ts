import { redirect } from 'next/navigation'
import { getFathomAuthUrl } from '@/server/fathom'
import { createOauthState, storeFathomOauthState } from '@/server/oauth-flow'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const returnTo = url.searchParams.get('return_to') ?? '/tokens'

  const clientId = url.searchParams.get('oauth_client_id')
  const redirectUri = url.searchParams.get('oauth_redirect_uri')
  const codeChallenge = url.searchParams.get('oauth_code_challenge')
  const state = url.searchParams.get('oauth_state') ?? ''

  const oauthState = createOauthState()

  await storeFathomOauthState({
    oauthState,
    returnTo,
    pendingOauth:
      clientId && redirectUri && codeChallenge
        ? { clientId, redirectUri, codeChallenge, state }
        : undefined,
  })

  const authUrl = getFathomAuthUrl(oauthState)
  redirect(authUrl as never)
}

export const runtime = 'nodejs'
