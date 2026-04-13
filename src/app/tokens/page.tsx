import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { env } from '@/env'
import { getSession } from '@/server/auth'
import {
  createMcpToken,
  deleteMcpToken,
  listMcpTokens,
} from '@/server/mcp/tokens'

const MCP_URL = `${env.NEXT_PUBLIC_BASE_URL}/mcp`

export default async function TokensPage() {
  const session = await getSession()
  if (!session) {
    redirect('/')
  }

  const tokens = await listMcpTokens(session.user.id)

  async function create(formData: FormData) {
    'use server'
    const s = await getSession()
    if (!s) {
      return
    }
    const raw = formData.get('label')
    const label =
      typeof raw === 'string' && raw.trim() ? raw.trim() : 'Manual token'
    await createMcpToken(s.user.id, label)
    redirect('/tokens')
  }

  return (
    <div className='min-h-screen bg-background'>
      <div className='mx-auto max-w-3xl px-6 py-12'>
        <div className='mb-8 flex items-start justify-between'>
          <div>
            <a
              className='font-semibold text-muted-foreground text-xs uppercase tracking-widest transition-colors hover:text-foreground'
              href='/'
            >
              ← Back
            </a>
            <h1 className='mt-2 font-bold text-3xl text-foreground'>
              MCP Tokens
            </h1>
            <p className='mt-1 text-muted-foreground text-sm'>
              Connected as{' '}
              <strong className='text-foreground'>
                {session.user.workspaceName}
              </strong>
            </p>
          </div>
        </div>

        {/* Create */}
        <div className='mb-6 rounded-2xl border border-border bg-card p-6'>
          <h2 className='mb-4 font-semibold text-base text-foreground'>
            Create token
          </h2>
          <form action={create} className='flex gap-3'>
            <input
              className='h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
              name='label'
              placeholder='Label (e.g. Claude Desktop)'
              type='text'
            />
            <Button size='sm' type='submit'>
              Create
            </Button>
          </form>
        </div>

        {/* MCP endpoint */}
        <div className='mb-6 rounded-2xl bg-muted p-6'>
          <p className='mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
            MCP endpoint
          </p>
          <code className='break-all font-mono text-foreground text-sm'>
            {MCP_URL}
          </code>
        </div>

        {/* Token list */}
        <div className='divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card'>
          {tokens.length === 0 ? (
            <div className='p-6 text-center text-muted-foreground text-sm'>
              No tokens yet. Create one above.
            </div>
          ) : (
            tokens.map((token) => (
              <TokenRow
                clientId={token.clientId}
                createdAt={token.createdAt}
                id={token.id}
                key={token.id}
                label={token.label}
                lastUsedAt={token.lastUsedAt}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function TokenRow({
  id,
  label,
  clientId,
  lastUsedAt,
  createdAt,
}: {
  id: string
  label: string
  clientId: string | null
  lastUsedAt: Date | null
  createdAt: Date
}) {
  async function revoke() {
    'use server'
    const s = await getSession()
    if (!s) {
      return
    }
    await deleteMcpToken(id, s.user.id)
    redirect('/tokens')
  }

  return (
    <div className='flex items-center gap-4 px-6 py-4'>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='truncate font-medium text-foreground text-sm'>
            {label}
          </span>
          {clientId ? (
            <span className='inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs'>
              OAuth
            </span>
          ) : null}
        </div>
        <p className='mt-0.5 text-muted-foreground text-xs'>
          Created {createdAt.toLocaleDateString()}
          {lastUsedAt
            ? ` · Last used ${lastUsedAt.toLocaleDateString()}`
            : ' · Never used'}
        </p>
      </div>
      <form action={revoke}>
        <Button size='sm' type='submit' variant='destructive'>
          Revoke
        </Button>
      </form>
    </div>
  )
}
