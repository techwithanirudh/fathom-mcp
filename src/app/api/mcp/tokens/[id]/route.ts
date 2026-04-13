import { NextResponse } from 'next/server'

import { getSession } from '@/server/auth'
import { deleteMcpToken } from '@/server/mcp/tokens'

export const DELETE = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params

  await deleteMcpToken(id, session.user.id)

  return new NextResponse(null, { status: 204 })
}
