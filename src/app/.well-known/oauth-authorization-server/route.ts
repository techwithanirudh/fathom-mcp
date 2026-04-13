import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { env } from '@/env'

const baseUrl = env.NEXT_PUBLIC_BASE_URL

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414).
 * MCP clients use this to discover authorization and token endpoints.
 */
function handler() {
  return Response.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    registration_endpoint: `${baseUrl}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['openid'],
    token_endpoint_auth_methods_supported: ['none'],
  })
}

export const GET = handler
export const OPTIONS = metadataCorsOptionsRequestHandler()
