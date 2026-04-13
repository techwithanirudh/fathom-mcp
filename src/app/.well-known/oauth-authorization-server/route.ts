import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { oauthMetadata } from '@/server/mcp-auth'

function handler() {
  return Response.json(oauthMetadata)
}

export const GET = handler
export const OPTIONS = metadataCorsOptionsRequestHandler()
