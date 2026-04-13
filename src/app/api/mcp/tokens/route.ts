import { z } from 'zod'

import { getSession } from '@/server/auth'
import { createToken, listTokens } from '@/server/tokens'

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

const createSchema = z.object({
  label: z.string().min(1).max(100),
})

export async function POST(req: Request) {
  const session = await getSession()

  if (!session) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const raw = await createToken(session.user.id, parsed.data.label)

  return Response.json({ token: raw }, { status: 201 })
}
