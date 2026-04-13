import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import {
  OAuthClientMetadataSchema,
  OAuthTokensSchema,
} from '@modelcontextprotocol/sdk/shared/auth.js'

import { env } from '@/env'
import { verifyToken } from '@/server/tokens'

export const MCP_SCOPE = 'mcp'

const loopbackHosts = new Set(['localhost', '127.0.0.1'])
const scopeSplit = /\s+/

export const normalizeRedirectUri = (value: string) => {
  try {
    const url = new URL(value)
    if (loopbackHosts.has(url.hostname)) {
      url.hostname = 'localhost'
    }
    return url.toString()
  } catch {
    return value
  }
}

export const parseDynamicClientRegistration = (body: unknown) => {
  const parsed = OAuthClientMetadataSchema.safeParse(body)

  if (!parsed.success) {
    return {
      hasRedirectError: parsed.error.issues.some((issue) =>
        issue.path.includes('redirect_uris')
      ),
      success: false as const,
    }
  }

  return {
    data: {
      ...parsed.data,
      grant_types: ['authorization_code'],
      redirect_uris: parsed.data.redirect_uris.map(normalizeRedirectUri),
      response_types: ['code'],
      token_endpoint_auth_method: 'none' as const,
    },
    success: true as const,
  }
}

export const supportsRequestedScopes = (scope?: string | null) => {
  if (!scope) {
    return true
  }
  const requested = scope
    .split(scopeSplit)
    .map((s) => s.trim())
    .filter(Boolean)
  return requested.every((s) => s === MCP_SCOPE)
}

export const verifyAccessToken = (
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) {
    return Promise.resolve(undefined)
  }
  return verifyToken(bearerToken)
}

export const createTokenResponse = (accessToken: string) =>
  OAuthTokensSchema.parse({
    access_token: accessToken,
    expires_in: 60 * 60 * 24 * 365,
    scope: MCP_SCOPE,
    token_type: 'Bearer',
  })

const base = env.NEXT_PUBLIC_BASE_URL

export const authServerMetadata = {
  authorization_endpoint: `${base}/oauth/authorize`,
  code_challenge_methods_supported: ['S256'],
  grant_types_supported: ['authorization_code'],
  issuer: base,
  registration_endpoint: `${base}/api/oauth/register`,
  response_types_supported: ['code'],
  scopes_supported: [MCP_SCOPE],
  token_endpoint: `${base}/api/oauth/token`,
  token_endpoint_auth_methods_supported: ['none'],
}

export const protectedResourceMetadata = {
  authorization_servers: [base],
  resource: `${base}/mcp`,
}
