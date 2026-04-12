import { getSession } from '@/server/auth'

const containerStyle = {
  margin: '0 auto',
  maxWidth: '880px',
  padding: '56px 24px 80px',
}

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #d7dce5',
  borderRadius: '20px',
  boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
  padding: '24px',
}

const codeStyle = {
  background: '#0f172a',
  borderRadius: '14px',
  color: '#e2e8f0',
  display: 'block',
  fontFamily:
    'ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.95rem',
  overflowX: 'auto' as const,
  padding: '18px 20px',
}

const linkStyle = {
  color: '#0f172a',
  fontWeight: 600,
}

export default async function HomePage() {
  const session = await getSession()

  return (
    <main
      style={{
        background:
          'linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)',
        minHeight: '100vh',
      }}
    >
      <div style={containerStyle}>
        <div
          style={{
            alignItems: 'flex-start',
            display: 'grid',
            gap: '24px',
          }}
        >
          <section style={cardStyle}>
            <p
              style={{
                color: '#475569',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Fathom MCP
            </p>
            <h1
              style={{
                color: '#0f172a',
                fontSize: 'clamp(2.6rem, 7vw, 4.8rem)',
                letterSpacing: '-0.05em',
                lineHeight: 1,
                margin: '18px 0 16px',
              }}
            >
              Self-hosted Fathom remote MCP.
            </h1>
            <p
              style={{
                color: '#334155',
                fontSize: '1.1rem',
                lineHeight: 1.7,
                margin: 0,
                maxWidth: '62ch',
              }}
            >
              This rewrite uses Fathom OAuth, T3 env validation, and the same
              Drizzle Postgres pattern from your other app. Connect your Fathom
              workspace, mint an MCP bearer token, and point Claude or another
              MCP client at this server.
            </p>
          </section>

          <section style={cardStyle}>
            <h2
              style={{
                color: '#0f172a',
                fontSize: '1.4rem',
                margin: '0 0 12px',
              }}
            >
              Status
            </h2>
            {session ? (
              <>
                <p style={{ color: '#334155', lineHeight: 1.7, marginTop: 0 }}>
                  Connected as <strong>{session.user.workspaceName}</strong>
                  {session.user.emailHint
                    ? ` (${session.user.emailHint})`
                    : null}
                  .
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <a href='/api/mcp/tokens' style={linkStyle}>
                    Create MCP bearer token
                  </a>
                  <a href='/mcp' style={linkStyle}>
                    Open MCP endpoint
                  </a>
                </div>
                <form action='/api/auth/signout' method='post'>
                  <button
                    style={{
                      background: '#0f172a',
                      border: 0,
                      borderRadius: '999px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      font: 'inherit',
                      padding: '10px 16px',
                    }}
                    type='submit'
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <p style={{ color: '#334155', lineHeight: 1.7, marginTop: 0 }}>
                  No Fathom connection is active yet. Start the OAuth flow and
                  this app will store your refresh token in Postgres, encrypted
                  at rest.
                </p>
                <a href='/api/integrations/fathom/connect' style={linkStyle}>
                  Connect with Fathom
                </a>
              </>
            )}
          </section>

          <section style={cardStyle}>
            <h2
              style={{
                color: '#0f172a',
                fontSize: '1.4rem',
                margin: '0 0 12px',
              }}
            >
              Remote MCP
            </h2>
            <p style={{ color: '#334155', lineHeight: 1.7, marginTop: 0 }}>
              Use the minted bearer token in an MCP client that supports
              authenticated remote HTTP servers.
            </p>
            <code style={codeStyle}>
              {`Authorization: Bearer <your-mcp-token>\nMCP URL: ${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/mcp`}
            </code>
          </section>
        </div>
      </div>
    </main>
  )
}
