import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { protectedResourceMetadata } from '@/server/mcp-auth'

interface RouteContext {
  params: Promise<{
    resource?: string[]
  }>
}

const isSupportedResourcePath = (resource?: string[]) =>
  resource?.length === 1 && resource[0] === 'mcp'

export async function GET(_req: Request, context: RouteContext) {
  const { resource } = await context.params

  if (!isSupportedResourcePath(resource)) {
    return new Response('Not found', { status: 404 })
  }

  return Response.json(protectedResourceMetadata)
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
