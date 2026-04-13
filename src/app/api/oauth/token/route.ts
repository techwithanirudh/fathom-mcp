import { redeemCode } from '@/server/auth/oauth'
import { createToken } from '@/server/tokens'

/**
 * OAuth 2.0 token endpoint.
 * Exchanges an authorization code + PKCE verifier for an MCP bearer token.
 */
export async function POST(req: Request) {
  let params: URLSearchParams

  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    params = new URLSearchParams(await req.text())
  } else {
    try {
      const body = (await req.json()) as Record<string, string>
      params = new URLSearchParams(body)
    } catch {
      return Response.json({ error: 'invalid_request' }, { status: 400 })
    }
  }

  const grantType = params.get('grant_type')
  const code = params.get('code')
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const codeVerifier = params.get('code_verifier')

  if (grantType !== 'authorization_code') {
    return Response.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }

  if (!(code && clientId && redirectUri && codeVerifier)) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const userId = await redeemCode({ code, clientId, redirectUri, codeVerifier })

  if (!userId) {
    return Response.json({ error: 'invalid_grant' }, { status: 400 })
  }

  const token = await createToken(userId, 'OAuth token', clientId)

  return Response.json({
    access_token: token,
    token_type: 'Bearer',
  })
}
