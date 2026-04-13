import { buttonVariants } from '@/components/ui/button'
import { env } from '@/env'
import { cn } from '@/lib/utils'
import { getSession } from '@/server/auth'

const MCP_URL = `${env.NEXT_PUBLIC_BASE_URL}/mcp`

export default async function HomePage() {
  const session = await getSession()

  return (
    <div className='min-h-screen bg-background'>
      <div className='mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16'>
        <div className='rounded-2xl border border-border bg-card p-8'>
          <p className='mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-widest'>
            Fathom MCP
          </p>
          <h1 className='mb-4 font-bold text-4xl text-foreground tracking-tight'>
            Self-hosted Fathom remote MCP.
          </h1>
          <p className='text-muted-foreground leading-relaxed'>
            Connect your Fathom workspace, then point any MCP client at this
            server. Tokens are issued via OAuth or minted manually.
          </p>
        </div>

        <div className='rounded-2xl border border-border bg-card p-8'>
          <h2 className='mb-4 font-semibold text-foreground text-lg'>Status</h2>

          {session ? (
            <div className='flex flex-col gap-4'>
              <p className='text-muted-foreground text-sm'>
                Connected as{' '}
                <strong className='text-foreground'>
                  {session.user.workspaceName}
                </strong>
                {session.user.emailHint ? ` (${session.user.emailHint})` : null}
              </p>

              <div className='flex flex-wrap gap-3'>
                <a
                  className={cn(buttonVariants({ size: 'sm' }))}
                  href='/tokens'
                >
                  Manage MCP tokens
                </a>
                <a
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'outline' })
                  )}
                  href='/mcp'
                >
                  MCP endpoint
                </a>
              </div>

              <form action='/api/auth/signout' method='post'>
                <button
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'ghost' })
                  )}
                  type='submit'
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className='flex flex-col gap-4'>
              <p className='text-muted-foreground text-sm'>
                No Fathom connection active. Connect your workspace to get
                started.
              </p>
              <a
                className={cn(buttonVariants({ size: 'sm' }), 'w-fit')}
                href='/api/integrations/fathom/connect'
              >
                Connect with Fathom
              </a>
            </div>
          )}
        </div>

        <div className='rounded-2xl border border-border bg-card p-8'>
          <h2 className='mb-2 font-semibold text-foreground text-lg'>
            MCP endpoint
          </h2>
          <p className='mb-4 text-muted-foreground text-sm'>
            MCP clients that support OAuth will handle authentication
            automatically. For manual token setup, visit{' '}
            <a
              className='font-medium text-foreground underline underline-offset-4'
              href='/tokens'
            >
              Manage tokens
            </a>
            .
          </p>
          <div className='rounded-xl bg-muted p-4'>
            <code className='break-all font-mono text-foreground text-sm'>
              {MCP_URL}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
