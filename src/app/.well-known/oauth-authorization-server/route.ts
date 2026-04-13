import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { authServerMetadata } from '@/server/mcp-auth'

export function GET() {
  return Response.json(authServerMetadata)
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
