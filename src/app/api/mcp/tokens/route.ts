import { NextResponse } from 'next/server'

import { getSession } from '@/server/auth'
import { createMcpToken, listMcpTokens } from '@/server/mcp/tokens'

export const GET = async () => {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const tokens = await listMcpTokens(session.user.id)

  return NextResponse.json({ tokens })
}

export const POST = async (request: Request) => {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let label = 'Manual token'

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (typeof body.label === 'string' && body.label.trim()) {
      label = body.label.trim()
    }
  } catch {
    // fall through with default label
  }

  const token = await createMcpToken(session.user.id, label)

  return NextResponse.json(
    {
      mcpUrl: new URL('/mcp', request.url).toString(),
      token,
      workspaceName: session.user.workspaceName,
    },
    { status: 201 }
  )
}
