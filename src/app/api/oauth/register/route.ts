import { NextResponse } from 'next/server'

import { createClient } from '@/server/oauth'

// RFC 7591 Dynamic Client Registration
export const POST = async (request: Request) => {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Invalid JSON body.' },
      { status: 400 }
    )
  }

  const {
    redirect_uris,
    client_name,
    client_uri,
    grant_types,
    token_endpoint_auth_method,
  } = body

  if (
    !Array.isArray(redirect_uris) ||
    redirect_uris.length === 0 ||
    redirect_uris.some((u) => typeof u !== 'string')
  ) {
    return NextResponse.json(
      {
        error: 'invalid_redirect_uri',
        error_description:
          'redirect_uris must be a non-empty array of strings.',
      },
      { status: 400 }
    )
  }

  const clientId = await createClient({
    redirectUris: redirect_uris as string[],
    clientName: typeof client_name === 'string' ? client_name : undefined,
    clientUri: typeof client_uri === 'string' ? client_uri : undefined,
    grantTypes: Array.isArray(grant_types)
      ? (grant_types as string[])
      : undefined,
    tokenEndpointAuthMethod:
      typeof token_endpoint_auth_method === 'string'
        ? token_endpoint_auth_method
        : undefined,
  })

  return NextResponse.json(
    {
      client_id: clientId,
      client_name: typeof client_name === 'string' ? client_name : null,
      redirect_uris,
      grant_types: Array.isArray(grant_types)
        ? grant_types
        : ['authorization_code'],
      token_endpoint_auth_method:
        typeof token_endpoint_auth_method === 'string'
          ? token_endpoint_auth_method
          : 'none',
      response_types: ['code'],
    },
    { status: 201 }
  )
}
