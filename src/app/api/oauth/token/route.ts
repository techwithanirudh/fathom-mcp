import { NextResponse } from 'next/server'

import { createMcpToken } from '@/server/mcp/tokens'
import { redeemCode } from '@/server/oauth'

// OAuth 2.1 token endpoint — authorization_code grant only
export const POST = async (request: Request) => {
  const contentType = request.headers.get('content-type') ?? ''

  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description:
          'Content-Type must be application/x-www-form-urlencoded.',
      },
      { status: 400 }
    )
  }

  const body = new URLSearchParams(await request.text())
  const grantType = body.get('grant_type')

  if (grantType !== 'authorization_code') {
    return NextResponse.json(
      {
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code is supported.',
      },
      { status: 400 }
    )
  }

  const code = body.get('code')
  const clientId = body.get('client_id')
  const redirectUri = body.get('redirect_uri')
  const codeVerifier = body.get('code_verifier')

  if (!(code && clientId && redirectUri)) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameters.',
      },
      { status: 400 }
    )
  }

  const result = await redeemCode(code, clientId, redirectUri, codeVerifier)

  if (!result) {
    return NextResponse.json(
      {
        error: 'invalid_grant',
        error_description: 'Code is invalid, expired, or already used.',
      },
      { status: 400 }
    )
  }

  const accessToken = await createMcpToken(
    result.userId,
    'OAuth token',
    clientId
  )

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'bearer',
    scope: result.scopes.join(' '),
  })
}
