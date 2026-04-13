import { getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import {
  OAuthClientMetadataSchema,
  OAuthMetadataSchema,
  OAuthProtectedResourceMetadataSchema,
  OAuthTokensSchema,
} from '@modelcontextprotocol/sdk/shared/auth.js'
import { generateProtectedResourceMetadata } from 'mcp-handler'

import { env } from '@/env'
import { verifyToken } from '@/server/tokens'

const baseUrl = new URL(env.NEXT_PUBLIC_BASE_URL)
const mcpUrl = new URL('/mcp', baseUrl)
const authorizationEndpoint = new URL('/oauth/authorize', baseUrl)
const tokenEndpoint = new URL('/api/oauth/token', baseUrl)
const registrationEndpoint = new URL('/api/oauth/register', baseUrl)

export const MCP_SCOPES = ['mcp'] as const

export const oauthMetadata = OAuthMetadataSchema.parse({
  issuer: baseUrl.toString(),
  authorization_endpoint: authorizationEndpoint.toString(),
  token_endpoint: tokenEndpoint.toString(),
  registration_endpoint: registrationEndpoint.toString(),
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code'],
  code_challenge_methods_supported: ['S256'],
  scopes_supported: [...MCP_SCOPES],
  token_endpoint_auth_methods_supported: ['none'],
  client_id_metadata_document_supported: false,
})

export const protectedResourceMetadata =
  OAuthProtectedResourceMetadataSchema.parse(
    generateProtectedResourceMetadata({
      authServerUrls: [oauthMetadata.issuer],
      resourceUrl: mcpUrl.toString(),
      additionalMetadata: {
        bearer_methods_supported: ['header'],
        scopes_supported: [...MCP_SCOPES],
        resource_name: 'Fathom MCP',
      },
    })
  )

export const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpUrl)
export const resourceMetadataPath = new URL(resourceMetadataUrl).pathname

const loopbackHosts = new Set(['localhost', '127.0.0.1'])

const normalizeLoopbackUri = (value: string) => {
  const url = new URL(value)

  if (loopbackHosts.has(url.hostname)) {
    url.hostname = 'localhost'
  }

  return url.toString()
}

export const parseDynamicClientRegistration = (body: unknown) => {
  const parsed = OAuthClientMetadataSchema.safeParse(body)

  if (!parsed.success) {
    return {
      success: false as const,
      hasRedirectError: parsed.error.issues.some((issue) =>
        issue.path.includes('redirect_uris')
      ),
    }
  }

  return {
    success: true as const,
    data: {
      ...parsed.data,
      redirect_uris: parsed.data.redirect_uris.map(normalizeLoopbackUri),
      token_endpoint_auth_method: 'none' as const,
      grant_types: ['authorization_code'],
      response_types: ['code'],
    },
  }
}

export const normalizeRedirectUri = normalizeLoopbackUri

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
    token_type: 'Bearer',
    expires_in: 60 * 60 * 24 * 365,
    scope: MCP_SCOPES.join(' '),
  })
