import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { env } from '@/env'
import { getSession } from '@/server/auth'
import { createCode, getClient } from '@/server/auth/oauth'
import {
  normalizeRedirectUri,
  supportsRequestedScopes,
} from '@/server/mcp-auth'

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function AuthorizePage({ searchParams }: Props) {
  const sp = await searchParams

  const clientId = sp.client_id
  const redirectUri = sp.redirect_uri
  const codeChallenge = sp.code_challenge
  const codeChallengeMethod = sp.code_challenge_method
  const state = sp.state ?? ''
  const responseType = sp.response_type
  const requestedScope = sp.scope
  const normalizedRedirectUri = redirectUri
    ? normalizeRedirectUri(redirectUri)
    : undefined

  if (
    !(clientId && redirectUri && codeChallenge) ||
    codeChallengeMethod !== 'S256' ||
    responseType !== 'code'
  ) {
    return <ErrorPage message='Invalid authorization request.' />
  }

  const client = await getClient(clientId)

  if (!client) {
    return <ErrorPage message='Unknown client.' />
  }

  if (!supportsRequestedScopes(requestedScope)) {
    return <ErrorPage message='Requested scope is not supported.' />
  }

  if (
    !(
      normalizedRedirectUri &&
      client.redirectUris.includes(normalizedRedirectUri)
    )
  ) {
    return <ErrorPage message='Redirect URI not registered for this client.' />
  }

  const session = await getSession()

  if (!session) {
    const connectUrl = new URL(
      '/api/integrations/fathom/connect',
      env.NEXT_PUBLIC_BASE_URL
    )
    connectUrl.searchParams.set('oauth_client_id', clientId)
    connectUrl.searchParams.set('oauth_redirect_uri', redirectUri)
    connectUrl.searchParams.set('oauth_code_challenge', codeChallenge)
    connectUrl.searchParams.set('oauth_state', state)
    redirect((connectUrl.pathname + connectUrl.search) as never)
  }

  async function authorize() {
    'use server'

    if (
      !(session && clientId && normalizedRedirectUri && codeChallenge && state)
    ) {
      return
    }

    const code = await createCode({
      clientId,
      userId: session.user.id,
      redirectUri: normalizedRedirectUri,
      codeChallenge,
    })

    const dest = new URL(normalizedRedirectUri)
    dest.searchParams.set('code', code)
    dest.searchParams.set('state', state)
    redirect(dest.toString() as never)
  }

  async function deny() {
    'use server'

    if (!(normalizedRedirectUri && state)) {
      return
    }

    const dest = new URL(normalizedRedirectUri)
    dest.searchParams.set('error', 'access_denied')
    dest.searchParams.set('state', state)
    redirect(dest.toString() as never)
  }

  return (
    <main className='flex min-h-screen flex-col items-center justify-center p-8'>
      <div className='w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm'>
        <div className='mb-6 flex flex-col gap-1'>
          <h1 className='font-semibold text-xl'>Authorize access</h1>
          <p className='text-muted-foreground text-sm'>
            <span className='font-medium text-foreground'>
              {client.name ?? clientId}
            </span>{' '}
            wants to access your Fathom meetings.
          </p>
        </div>

        <p className='mb-6 text-muted-foreground text-sm'>
          Signed in as{' '}
          <span className='font-medium text-foreground'>
            {session.user.workspaceName}
          </span>
          .
        </p>

        <div className='flex gap-3'>
          <form action={deny} className='flex-1'>
            <Button className='w-full' type='submit' variant='outline'>
              Deny
            </Button>
          </form>
          <form action={authorize} className='flex-1'>
            <Button className='w-full' type='submit'>
              Authorize
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center p-8'>
      <div className='flex flex-col items-center gap-2 text-center'>
        <h1 className='font-semibold text-destructive text-xl'>Error</h1>
        <p className='text-muted-foreground text-sm'>{message}</p>
      </div>
    </main>
  )
}
