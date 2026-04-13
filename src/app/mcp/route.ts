import { createMcpHandler, withMcpAuth } from 'mcp-handler'

import { env } from '@/env'
import { verifyToken } from '@/server/tokens'
import { instructions } from './instructions'
import { registerResources } from './resources'
import { registerTools } from './tools'

const mcpHandler = createMcpHandler(
  (server) => {
    registerResources(server)
    registerTools(server)
  },
  {
    serverInfo: { name: 'fathom-mcp', version: '1.0.0' },
    instructions,
  }
)

const handler = withMcpAuth(
  mcpHandler,
  (_req, bearerToken) => {
    if (!bearerToken) {
      return undefined
    }
    return verifyToken(bearerToken)
  },
  { required: true, resourceUrl: env.NEXT_PUBLIC_BASE_URL }
)

export { handler as GET, handler as POST, handler as DELETE }
