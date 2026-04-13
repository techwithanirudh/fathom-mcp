import { redeemCode } from '@/server/auth/oauth'
import { createTokenResponse } from '@/server/mcp-auth'
import {
  invalidGrant,
  invalidRequest,
  parseTokenRequest,
  unsupportedGrantType,
} from '@/server/oauth-flow'
import { createToken } from '@/server/tokens'

/**
 * OAuth 2.0 token endpoint.
 * Exchanges an authorization code + PKCE verifier for an MCP bearer token.
 */
export async function POST(req: Request) {
  const params = await parseTokenRequest(req)

  if (!params) {
    return invalidRequest()
  }

  const grantType = params.get('grant_type')
  const code = params.get('code')
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const codeVerifier = params.get('code_verifier')

  if (grantType !== 'authorization_code') {
    return unsupportedGrantType()
  }

  if (!(code && clientId && redirectUri && codeVerifier)) {
    return invalidRequest()
  }

  const userId = await redeemCode({ code, clientId, redirectUri, codeVerifier })

  if (!userId) {
    return invalidGrant()
  }

  const token = await createToken(userId, 'OAuth token', clientId)

  return Response.json(createTokenResponse(token))
}
