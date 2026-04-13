import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from 'mcp-handler'

import { env } from '@/env'

const baseUrl = env.NEXT_PUBLIC_BASE_URL

const handler = protectedResourceHandler({
  authServerUrls: [baseUrl],
  resourceUrl: `${baseUrl}/mcp`,
})

export const GET = handler
export const OPTIONS = metadataCorsOptionsRequestHandler()
