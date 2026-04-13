import { randomUUID } from 'node:crypto'

import type { Meeting } from 'fathom-typescript/sdk/models/shared/meeting'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createSession } from '@/server/auth'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import {
  findUserByEmail,
  inferWorkspace,
  initOAuthClient,
  persistOAuthTokens,
} from '@/server/fathom/client'

const STATE_COOKIE = 'fathom-mcp.oauth-state'
const OAUTH_RETURN_COOKIE = 'fathom-mcp.oauth-return'

export const GET = async (request: Request) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const jar = await cookies()
  const expectedState = jar.get(STATE_COOKIE)?.value

  jar.delete(STATE_COOKIE)

  if (!(code && state && expectedState && state === expectedState)) {
    return NextResponse.redirect(new URL('/?error=oauth-state', request.url))
  }

  try {
    const { client, tempStore } = initOAuthClient(code)

    let meetings: Meeting[] = []

    try {
      const iter = await client.listMeetings({})
      for await (const page of iter) {
        meetings = page?.result.items ?? []
        break
      }
    } catch {
      // non-fatal — we still create the user
    }

    const inferred = inferWorkspace(meetings)
    const existing = inferred.emailHint
      ? await findUserByEmail(inferred.emailHint)
      : null
    const userId = existing?.id ?? randomUUID()

    if (!existing) {
      await db.insert(users).values({
        id: userId,
        workspaceName: inferred.workspaceName,
        emailHint: inferred.emailHint,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    await persistOAuthTokens(userId, tempStore, {
      emailHint: inferred.emailHint,
      recorderName: inferred.recorderName,
    })

    await createSession(userId)

    // Resume OAuth authorize flow if one was in progress
    const oauthReturn = jar.get(OAUTH_RETURN_COOKIE)?.value
    jar.delete(OAUTH_RETURN_COOKIE)

    if (oauthReturn?.startsWith('/oauth/authorize')) {
      return NextResponse.redirect(new URL(oauthReturn, request.url))
    }

    return NextResponse.redirect(new URL('/?connected=1', request.url))
  } catch {
    return NextResponse.redirect(new URL('/?error=oauth-callback', request.url))
  }
}
