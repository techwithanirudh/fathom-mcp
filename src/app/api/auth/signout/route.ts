import { NextResponse } from 'next/server'

import { clearSession } from '@/server/auth'

export const POST = async (request: Request) => {
  await clearSession()

  return NextResponse.redirect(new URL('/', request.url))
}
