import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { createSession } from '@/server/auth'
import { createCode } from '@/server/auth/oauth'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import {
  findUserByEmail,
  inferWorkspaceFromMeetings,
  initFathomOAuth,
  saveFathomTokens,
} from '@/server/fathom'

interface PendingOAuth {
  clientId: string
  codeChallenge: string
  redirectUri: string
  state: string
}

/**
 * Fathom OAuth callback.
 *
 * 1. Validates state cookie (CSRF).
 * 2. Exchanges code for tokens.
 * 3. Infers workspace from meetings.
 * 4. Creates or reuses a user record.
 * 5. If there are pending MCP OAuth params (from /oauth/authorize),
 *    completes that flow by creating an authorization code and redirecting.
 * 6. Otherwise, redirects to /tokens.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const jar = await cookies()
  const savedState = jar.get('fathom_oauth_state')?.value
  const returnTo = jar.get('fathom_oauth_return')?.value ?? '/tokens'
  const pendingOAuth = jar.get('oauth_pending')?.value

  jar.delete('fathom_oauth_state')
  jar.delete('fathom_oauth_return')

  if (!(code && state) || state !== savedState) {
    redirect('/?error=invalid_state')
  }

  // Exchange code for Fathom tokens.
  const { client, tempStore } = initFathomOAuth(code)

  // Fetch first page of meetings to infer workspace identity.
  const iter = await client.listMeetings()
  let meetings: Awaited<
    ReturnType<typeof client.listMeetings>
  >['result']['items'] = []

  for await (const page of iter) {
    if (page) {
      meetings = page.result.items
    }

    break
  }

  const { email, workspaceName } = inferWorkspaceFromMeetings(meetings)

  // Reuse existing user if we've seen this email before.
  let user = email ? await findUserByEmail(email) : null

  if (user) {
    await db.update(users).set({ workspaceName }).where(eq(users.id, user.id))
  } else {
    const id = randomUUID()
    await db.insert(users).values({ id, workspaceName, emailHint: email })
    user = {
      id,
      workspaceName,
      emailHint: email,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  await saveFathomTokens(user.id, tempStore, email)
  await createSession(user.id)

  jar.delete('oauth_pending')

  // If there was a pending MCP OAuth flow, complete it.
  if (pendingOAuth) {
    let params: PendingOAuth

    try {
      params = JSON.parse(pendingOAuth) as PendingOAuth
    } catch {
      redirect('/tokens')
    }

    const authCode = await createCode({
      clientId: params.clientId,
      userId: user.id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
    })

    const dest = new URL(params.redirectUri)
    dest.searchParams.set('code', authCode)
    dest.searchParams.set('state', params.state)
    redirect(dest.toString())
  }

  redirect(returnTo)
}

export const runtime = 'nodejs'
