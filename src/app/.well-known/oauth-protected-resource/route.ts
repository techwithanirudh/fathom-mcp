import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { env } from '@/env'

export const OPTIONS = metadataCorsOptionsRequestHandler()

export const GET = () => {
  const base = env.NEXT_PUBLIC_BASE_URL

  return Response.json({
    authorization_servers: [base],
    resource: `${base}/mcp`,
    scopes_supported: ['mcp'],
  })
}
