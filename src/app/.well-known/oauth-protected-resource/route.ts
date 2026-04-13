import { metadataCorsOptionsRequestHandler } from 'mcp-handler'

import { protectedResourceMetadata } from '@/server/mcp-auth'

const handler = () => Response.json(protectedResourceMetadata)

export const GET = handler
export const OPTIONS = metadataCorsOptionsRequestHandler()
