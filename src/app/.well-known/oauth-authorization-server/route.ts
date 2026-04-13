import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { env } from '@/env'

export const OPTIONS = metadataCorsOptionsRequestHandler()

export const GET = () => {
  const base = env.NEXT_PUBLIC_BASE_URL

  return Response.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['mcp'],
    client_id_metadata_document_supported: false,
  })
}
