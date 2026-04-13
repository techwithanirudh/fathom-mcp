import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
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
import { consumeFathomOauthState } from '@/server/oauth-flow'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const { pendingOauth, returnTo, savedState } = await consumeFathomOauthState()

  if (!(code && state) || state !== savedState) {
    redirect('/?error=invalid_state')
  }

  const { client, tempStore } = initFathomOAuth(code)

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

  if (pendingOauth) {
    const authCode = await createCode({
      clientId: pendingOauth.clientId,
      userId: user.id,
      redirectUri: pendingOauth.redirectUri,
      codeChallenge: pendingOauth.codeChallenge,
    })

    const dest = new URL(pendingOauth.redirectUri)
    dest.searchParams.set('code', authCode)
    dest.searchParams.set('state', pendingOauth.state)
    redirect(dest.toString() as never)
  }

  redirect(returnTo as never)
}

export const runtime = 'nodejs'
