import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { protectedResourceMetadata } from '@/server/mcp-auth'

export function GET() {
  return Response.json(protectedResourceMetadata)
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
