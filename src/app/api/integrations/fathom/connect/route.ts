import { randomUUID } from 'node:crypto'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getFathomAuthUrl } from '@/server/fathom'

/**
 * Kicks off Fathom OAuth.
 * The `state` param is a random UUID stored in a cookie for CSRF protection.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const returnTo = url.searchParams.get('return_to') ?? '/tokens'

  const state = randomUUID()

  const jar = await cookies()
  jar.set('fathom_oauth_state', state, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
  })
  jar.set('fathom_oauth_return', returnTo, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
  })

  const authUrl = getFathomAuthUrl(state)
  redirect(authUrl)
}

export const runtime = 'nodejs'
