import { encodeBase64urlNoPadding } from '@oslojs/encoding'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { buildFathomAuthorizationUrl } from '@/server/fathom/client'

const STATE_COOKIE_NAME = 'fathom-mcp.oauth-state'

const generateState = () => {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)

  return encodeBase64urlNoPadding(bytes)
}

export const GET = async (request: Request) => {
  try {
    const state = generateState()
    const cookieStore = await cookies()

    cookieStore.set(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      maxAge: 60 * 10,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return NextResponse.redirect(buildFathomAuthorizationUrl(state))
  } catch {
    return NextResponse.redirect(new URL('/?error=oauth-config', request.url))
  }
}
