import { z } from 'zod'

import { registerClient } from '@/server/auth/oauth'

// Accept any absolute URI for redirect_uris — RFC 7591 doesn't restrict to http/https,
// and MCP clients may use http://127.0.0.1:PORT, http://localhost:PORT, or custom schemes.
const isAbsoluteUri = (s: string) => {
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

const schema = z.object({
  client_name: z.string().optional(),
  client_uri: z.string().optional(),
  redirect_uris: z
    .array(z.string().min(1).refine(isAbsoluteUri, 'Must be an absolute URI'))
    .min(1),
})

/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591).
 */
export async function POST(req: Request) {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    const hasRedirectError = parsed.error.issues.some((i) =>
      i.path.includes('redirect_uris')
    )
    return Response.json(
      { error: hasRedirectError ? 'invalid_redirect_uri' : 'invalid_request' },
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
    {
      client_id: clientId,
      redirect_uris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    { status: 201 }
  )
}
