import { redirect } from 'next/navigation'
import { TokenCreateDialog } from '@/components/token-create-dialog'
import { Button } from '@/components/ui/button'
import { env } from '@/env'
import { clearSession, getSession } from '@/server/auth'
import {
  createToken,
  deleteToken as deleteMcpToken,
  listTokens,
} from '@/server/tokens'

export default async function TokensPage() {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  const tokens = await listTokens(session.user.id)
  const mcpUrl = `${env.NEXT_PUBLIC_BASE_URL}/mcp`

  async function createNewToken(label: string): Promise<string> {
    'use server'

    const sess = await getSession()
    if (!sess) {
      throw new Error('Unauthorized')
    }

    return createToken(sess.user.id, label)
  }

  async function signOut() {
    'use server'

    await clearSession()
    redirect('/')
  }

  async function deleteToken(formData: FormData) {
    'use server'

    const sess = await getSession()
    if (!sess) {
      return
    }

    const id = formData.get('id') as string | null
    if (!id) {
      return
    }

    await deleteMcpToken(id, sess.user.id)
    redirect('/tokens')
  }

  return (
    <main className='mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='font-bold text-2xl tracking-tight'>Fathom MCP</h1>
          <p className='text-muted-foreground text-sm'>
            {session.user.workspaceName}
          </p>
        </div>
        <form action={signOut}>
          <Button size='sm' type='submit' variant='ghost'>
            Sign out
          </Button>
        </form>
      </div>

      {/* MCP endpoint */}
      <section className='flex flex-col gap-2'>
        <h2 className='font-semibold text-muted-foreground text-sm uppercase tracking-wide'>
          MCP endpoint
        </h2>
        <div className='rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm'>
          <span className='select-all'>{mcpUrl}</span>
        </div>
        <p className='text-muted-foreground text-xs'>
          Configure this URL in your MCP client. Supports both OAuth and bearer
          token auth.
        </p>
      </section>

      {/* Token list */}
      <section className='flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <h2 className='font-semibold text-muted-foreground text-sm uppercase tracking-wide'>
            Active tokens
          </h2>
          <TokenCreateDialog createToken={createNewToken} />
        </div>

        {tokens.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            No tokens yet. Create one to get started.
          </p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {tokens.map((t) => (
              <li
                className='flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3'
                key={t.id}
              >
                <div className='flex flex-col gap-0.5'>
                  <span className='font-medium text-sm'>{t.label}</span>
                  <span className='text-muted-foreground text-xs'>
                    {t.lastUsedAt
                      ? `Last used ${t.lastUsedAt.toLocaleDateString()}`
                      : `Created ${t.createdAt.toLocaleDateString()}`}
                    {t.clientId ? ' · via OAuth' : ''}
                  </span>
                </div>
                <form action={deleteToken}>
                  <input name='id' type='hidden' value={t.id} />
                  <Button size='sm' type='submit' variant='destructive'>
                    Revoke
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
