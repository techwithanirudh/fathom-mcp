import { NextResponse } from 'next/server'

import { getSession } from '@/server/auth'
import { createMcpToken } from '@/server/mcp/tokens'

export const GET = async (request: Request) => {
  const session = await getSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Sign in with Fathom before creating an MCP token.' },
      { status: 401 }
    )
  }

  const token = await createMcpToken(session.user.id, 'Claude / MCP token')

  return NextResponse.json({
    token,
    mcpUrl: new URL('/mcp', request.url).toString(),
    workspaceName: session.user.workspaceName,
  })
}
