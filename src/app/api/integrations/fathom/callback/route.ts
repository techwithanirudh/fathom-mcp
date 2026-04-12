import { randomUUID } from 'node:crypto'

import type { Meeting } from 'fathom-typescript/sdk/models/shared/meeting'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { createSession } from '@/server/auth'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import {
  findExistingUserForMeetings,
  inferWorkspaceFromMeetings,
  initOAuthClient,
  persistOAuthTokens,
} from '@/server/fathom/client'

const STATE_COOKIE_NAME = 'fathom-mcp.oauth-state'

export const GET = async (request: Request) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(STATE_COOKIE_NAME)?.value

  cookieStore.delete(STATE_COOKIE_NAME)

  if (!(code && state && expectedState && state === expectedState)) {
    return NextResponse.redirect(new URL('/?error=oauth-state', request.url))
  }

  try {
    const { client, tempStore } = initOAuthClient(code)

    let bootstrapMeetings: Meeting[] = []

    try {
      const iterator = await client.listMeetings({})
      for await (const page of iterator) {
        bootstrapMeetings = page?.result.items ?? []
        break
      }
    } catch {
      bootstrapMeetings = []
    }

    const existingUser = await findExistingUserForMeetings(bootstrapMeetings)
    const inferred = inferWorkspaceFromMeetings(bootstrapMeetings)
    const userId = existingUser?.id ?? randomUUID()

    if (!existingUser) {
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

    return NextResponse.redirect(new URL('/?connected=1', request.url))
  } catch {
    return NextResponse.redirect(new URL('/?error=oauth-callback', request.url))
  }
}
