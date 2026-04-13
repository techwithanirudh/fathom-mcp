import { getSession } from '@/server/auth'
import { deleteToken } from '@/server/tokens'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()

  if (!session) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await deleteToken(id, session.user.id)

  return new Response(null, { status: 204 })
}
