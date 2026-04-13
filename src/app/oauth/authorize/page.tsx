import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getSession } from '@/server/auth'
import { createCode, findClient, isRedirectUriAllowed } from '@/server/oauth'

const OAUTH_RETURN_COOKIE = 'fathom-mcp.oauth-return'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function str(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const v = params[key]
  return typeof v === 'string' ? v : undefined
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const responseType = str(params, 'response_type')
  const clientId = str(params, 'client_id')
  const redirectUri = str(params, 'redirect_uri')
  const codeChallenge = str(params, 'code_challenge')
  const codeChallengeMethod = str(params, 'code_challenge_method')
  const scope = str(params, 'scope') ?? 'mcp'
  const state = str(params, 'state')

  // Validate without redirecting — redirect_uri may not be trustworthy yet
  if (responseType !== 'code' || !clientId || !redirectUri) {
    return <ErrorPage message='Missing or invalid authorization parameters.' />
  }

  const client = await findClient(clientId)

  if (!client) {
    return <ErrorPage message='Unknown client_id.' />
  }

  if (!isRedirectUriAllowed(client.redirectUris, redirectUri)) {
    return (
      <ErrorPage message='redirect_uri does not match any registered URI for this client.' />
    )
  }

  // PKCE: S256 is the only accepted method
  if (codeChallenge && codeChallengeMethod !== 'S256') {
    const dest = new URL(redirectUri)
    dest.searchParams.set('error', 'invalid_request')
    dest.searchParams.set(
      'error_description',
      'Only S256 code_challenge_method is supported.'
    )
    if (state) {
      dest.searchParams.set('state', state)
    }
    redirect(dest.toString())
  }

  const session = await getSession()

  if (!session) {
    // Preserve the authorize URL in a cookie so the callback can resume the flow
    const returnPath =
      '/oauth/authorize?' +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => typeof v === 'string') as [
            string,
            string,
          ][]
        )
      ).toString()

    const jar = await cookies()
    jar.set(OAUTH_RETURN_COOKIE, returnPath, {
      httpOnly: true,
      maxAge: 60 * 15,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    redirect('/api/integrations/fathom/connect')
  }

  const scopes = scope.split(' ').filter((s) => s === 'mcp')
  const effectiveScopes = scopes.length > 0 ? scopes : ['mcp']

  async function approve() {
    'use server'
    const s = await getSession()
    if (!(s && clientId && redirectUri)) {
      return
    }

    const code = await createCode({
      clientId,
      userId: s.user.id,
      redirectUri,
      codeChallenge: codeChallenge ?? null,
      codeChallengeMethod: codeChallengeMethod ?? null,
      scopes: effectiveScopes,
    })

    const dest = new URL(redirectUri)
    dest.searchParams.set('code', code)
    if (state) {
      dest.searchParams.set('state', state)
    }
    redirect(dest.toString())
  }

  async function deny() {
    'use server'
    if (!redirectUri) {
      return
    }

    const dest = new URL(redirectUri)
    dest.searchParams.set('error', 'access_denied')
    dest.searchParams.set('error_description', 'User denied authorization.')
    if (state) {
      dest.searchParams.set('state', state)
    }
    redirect(dest.toString())
  }

  const hostname = new URL(redirectUri).hostname

  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-6'>
      <div className='w-full max-w-sm'>
        <div className='rounded-2xl border border-border bg-card p-8 shadow-sm'>
          <p className='mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
            Authorization Request
          </p>
          <h1 className='mb-1 font-bold text-2xl text-foreground'>
            {client.clientName ?? 'An application'} wants access
          </h1>
          {client.clientUri ? (
            <p className='mb-6 text-muted-foreground text-sm'>
              {client.clientUri}
            </p>
          ) : (
            <div className='mb-6' />
          )}

          <div className='mb-6 rounded-xl bg-muted p-4'>
            <p className='mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
              Permissions
            </p>
            <ul className='space-y-1'>
              {effectiveScopes.map((s) => (
                <li
                  className='flex items-center gap-2 text-foreground text-sm'
                  key={s}
                >
                  <span className='inline-block size-1.5 rounded-full bg-primary' />
                  {s === 'mcp' ? 'Full access to Fathom MCP tools' : s}
                </li>
              ))}
            </ul>
          </div>

          <p className='mb-4 text-muted-foreground text-sm'>
            Signed in as{' '}
            <strong className='text-foreground'>
              {session.user.workspaceName}
            </strong>
            {session.user.emailHint ? ` (${session.user.emailHint})` : ''}
          </p>

          <div className='flex gap-3'>
            <form action={deny} className='flex-1'>
              <Button className='w-full' type='submit' variant='outline'>
                Deny
              </Button>
            </form>
            <form action={approve} className='flex-1'>
              <Button className='w-full' type='submit'>
                Allow
              </Button>
            </form>
          </div>

          <p className='mt-4 text-center text-muted-foreground text-xs'>
            Redirecting to: <span className='font-mono'>{hostname}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-6'>
      <div className='w-full max-w-sm'>
        <div className='rounded-2xl border border-border bg-card p-8 text-center shadow-sm'>
          <h1 className='mb-2 font-bold text-foreground text-xl'>
            Authorization Error
          </h1>
          <p className='text-muted-foreground text-sm'>{message}</p>
        </div>
      </div>
    </div>
  )
}
