import { getSession } from '@/server/auth'
import { listTokens } from '@/server/tokens'

export async function GET() {
  const session = await getSession()

  if (!session) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const tokens = await listTokens(session.user.id)

  return Response.json(
    tokens.map((t) => ({
      id: t.id,
      label: t.label,
      clientId: t.clientId,
      lastUsedAt: t.lastUsedAt,
      createdAt: t.createdAt,
    }))
  )
}
