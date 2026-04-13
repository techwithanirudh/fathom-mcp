import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { getSession } from '@/server/auth'

export default async function HomePage() {
  const session = await getSession()

  if (session) {
    redirect('/tokens')
  }

  return (
    <main className='flex min-h-screen flex-col items-center justify-center gap-6 p-8'>
      <div className='flex flex-col items-center gap-2 text-center'>
        <h1 className='font-bold text-3xl tracking-tight'>Fathom MCP</h1>
        <p className='max-w-sm text-muted-foreground'>
          Connect your Fathom account to use your meeting recordings and
          transcripts with any MCP-compatible AI assistant.
        </p>
      </div>

      <a
        className={buttonVariants({ size: 'lg' })}
        href='/api/integrations/fathom/connect'
      >
        Connect Fathom
      </a>
    </main>
  )
}
