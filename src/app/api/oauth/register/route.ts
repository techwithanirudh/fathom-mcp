import { registerClient } from '@/server/auth/oauth'
import { parseDynamicClientRegistration } from '@/server/mcp-auth'
import {
  createClientRegistrationResponse,
  invalidRequest,
} from '@/server/oauth-flow'

/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591).
 */
export async function POST(req: Request) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return invalidRequest()
  }

  const parsed = parseDynamicClientRegistration(body)

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.hasRedirectError
          ? 'invalid_redirect_uri'
          : 'invalid_request',
      },
      { status: 400 }
    )
  }

  const { client_name, client_uri, redirect_uris } = parsed.data

  const clientId = await registerClient({
    name: client_name,
    uri: client_uri,
    redirectUris: redirect_uris,
  })

  return Response.json(
    createClientRegistrationResponse({
      clientId,
      clientName: client_name,
      clientUri: client_uri,
      grantTypes: parsed.data.grant_types,
      redirectUris: redirect_uris,
      responseTypes: parsed.data.response_types,
      scope: parsed.data.scope,
    }),
    { status: 201 }
  )
}
