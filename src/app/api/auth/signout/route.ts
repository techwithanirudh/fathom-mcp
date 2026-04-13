import { redirect } from 'next/navigation'

import { clearSession } from '@/server/auth'

export async function POST() {
  await clearSession()
  redirect('/')
}
