import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { env } from '@/env'
import { clearSession, getSession } from '@/server/auth'
import {
  createToken as createMcpToken,
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

  // Read the newly-created token from a short-lived cookie (shown once).
  const jar = await cookies()
  const newToken = jar.get('new_token')?.value
  if (newToken) {
    jar.delete('new_token')
  }

  async function signOut() {
    'use server'

    await clearSession()
    redirect('/')
  }

  async function createToken(formData: FormData) {
    'use server'

    const sess = await getSession()
    if (!sess) {
      return
    }

    const label = (formData.get('label') as string | null)?.trim()
    if (!label) {
      return
    }

    const raw = await createMcpToken(sess.user.id, label)

    const cookieJar = await cookies()
    cookieJar.set('new_token', raw, {
      httpOnly: false,
      path: '/tokens',
      sameSite: 'strict',
      maxAge: 60,
    })

    redirect('/tokens')
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
        <div className='flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 font-mono text-sm'>
          <span className='flex-1 select-all'>{mcpUrl}</span>
        </div>
        <p className='text-muted-foreground text-xs'>
          Configure this URL in your MCP client. It supports both OAuth and
          bearer token auth.
        </p>
      </section>

      {/* Newly created token — shown once */}
      {newToken && (
        <section className='flex flex-col gap-2'>
          <h2 className='font-semibold text-green-600 text-sm uppercase tracking-wide dark:text-green-400'>
            New token (copy now — shown once)
          </h2>
          <div className='rounded-lg border border-green-300 bg-green-50 px-4 py-3 font-mono text-sm dark:border-green-800 dark:bg-green-950'>
            <span className='select-all break-all'>{newToken}</span>
          </div>
        </section>
      )}

      {/* Create token */}
      <section className='flex flex-col gap-4'>
        <h2 className='font-semibold text-muted-foreground text-sm uppercase tracking-wide'>
          Create token
        </h2>
        <form action={createToken} className='flex gap-2'>
          <input
            className='flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            maxLength={100}
            name='label'
            placeholder='e.g. Claude Desktop'
            required
          />
          <Button type='submit'>Create</Button>
        </form>
      </section>

      {/* Token list */}
      <section className='flex flex-col gap-4'>
        <h2 className='font-semibold text-muted-foreground text-sm uppercase tracking-wide'>
          Active tokens
        </h2>

        {tokens.length === 0 ? (
          <p className='text-muted-foreground text-sm'>
            No tokens yet. Create one above to get started.
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
