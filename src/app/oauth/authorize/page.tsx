import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { getSession } from '@/server/auth'
import { createCode, getClient } from '@/server/auth/oauth'

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

  // Basic parameter validation.
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

  if (!client.redirectUris.includes(redirectUri)) {
    return <ErrorPage message='Redirect URI not registered for this client.' />
  }

  const session = await getSession()

  // If the user is not connected to Fathom, save the OAuth params and send
  // them through Fathom OAuth first. The callback will resume this flow.
  if (!session) {
    const jar = await cookies()
    jar.set(
      'oauth_pending',
      JSON.stringify({ clientId, redirectUri, codeChallenge, state }),
      {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 10,
      }
    )
    redirect('/api/integrations/fathom/connect')
  }

  // Server action: user clicks "Authorize".
  async function authorize() {
    'use server'

    if (!(session && clientId && redirectUri && codeChallenge && state)) {
      return
    }

    const code = await createCode({
      clientId,
      userId: session.user.id,
      redirectUri,
      codeChallenge,
    })

    const dest = new URL(redirectUri)
    dest.searchParams.set('code', code)
    dest.searchParams.set('state', state)
    redirect(dest.toString())
  }

  // Server action: user clicks "Deny".
  async function deny() {
    'use server'

    if (!(redirectUri && state)) {
      return
    }

    const dest = new URL(redirectUri)
    dest.searchParams.set('error', 'access_denied')
    dest.searchParams.set('state', state)
    redirect(dest.toString())
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
