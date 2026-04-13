import { randomUUID } from 'node:crypto'

import {
  OAuthClientInformationFullSchema,
  OAuthErrorResponseSchema,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { cookies } from 'next/headers'

const SECURE = process.env.NODE_ENV === 'production'

const COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: SECURE,
  maxAge: 60 * 10,
} as const

const FATHOM_OAUTH_STATE_COOKIE = 'fathom_oauth_state'
const FATHOM_OAUTH_RETURN_COOKIE = 'fathom_oauth_return'
const MCP_PENDING_OAUTH_COOKIE = 'oauth_pending'

const tokenError = (
  error: string,
  status: number,
  error_description?: string
) =>
  Response.json(
    OAuthErrorResponseSchema.parse({
      error,
      error_description,
    }),
    { status }
  )

export const invalidRequest = (description?: string) =>
  tokenError('invalid_request', 400, description)

export const invalidGrant = (description?: string) =>
  tokenError('invalid_grant', 400, description)

export const unsupportedGrantType = () =>
  tokenError('unsupported_grant_type', 400)

export interface PendingOAuth {
  clientId: string
  codeChallenge: string
  redirectUri: string
  state: string
}

export const createOauthState = () => randomUUID()

export const storeFathomOauthState = async (params: {
  oauthState: string
  returnTo: string
  pendingOauth?: PendingOAuth
}) => {
  const jar = await cookies()

  jar.set(FATHOM_OAUTH_STATE_COOKIE, params.oauthState, COOKIE_OPTS)
  jar.set(FATHOM_OAUTH_RETURN_COOKIE, params.returnTo, COOKIE_OPTS)

  if (params.pendingOauth) {
    jar.set(
      MCP_PENDING_OAUTH_COOKIE,
      JSON.stringify(params.pendingOauth),
      COOKIE_OPTS
    )
  } else {
    jar.delete(MCP_PENDING_OAUTH_COOKIE)
  }
}

export const consumeFathomOauthState = async () => {
  const jar = await cookies()
  const savedState = jar.get(FATHOM_OAUTH_STATE_COOKIE)?.value
  const returnTo = jar.get(FATHOM_OAUTH_RETURN_COOKIE)?.value ?? '/tokens'
  const pendingOauth = jar.get(MCP_PENDING_OAUTH_COOKIE)?.value

  jar.delete(FATHOM_OAUTH_STATE_COOKIE)
  jar.delete(FATHOM_OAUTH_RETURN_COOKIE)
  jar.delete(MCP_PENDING_OAUTH_COOKIE)

  return {
    savedState,
    returnTo,
    pendingOauth: parsePendingOauth(pendingOauth),
  }
}

export const parsePendingOauth = (
  value?: string | null
): PendingOAuth | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingOAuth
  } catch {
    return null
  }
}

export const parseTokenRequest = async (req: Request) => {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(await req.text())
  }

  try {
    const body = (await req.json()) as Record<string, string>
    return new URLSearchParams(body)
  } catch {
    return null
  }
}

export const createClientRegistrationResponse = (input: {
  clientId: string
  clientIdIssuedAt?: number
  clientName?: string
  clientUri?: string
  grantTypes: string[]
  redirectUris: string[]
  responseTypes: string[]
  scope?: string
}) =>
  OAuthClientInformationFullSchema.parse({
    client_id: input.clientId,
    client_id_issued_at: input.clientIdIssuedAt,
    client_name: input.clientName,
    client_uri: input.clientUri,
    grant_types: input.grantTypes,
    redirect_uris: input.redirectUris,
    response_types: input.responseTypes,
    scope: input.scope,
    token_endpoint_auth_method: 'none',
  })
