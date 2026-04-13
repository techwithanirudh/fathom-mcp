# Fathom MCP

This project exposes Fathom meeting data through an MCP server built with Next.js 16 and `mcp-handler`.

The main use case is simple: connect a Fathom account once, then let an MCP client read meeting lists, transcripts, summaries, and team data through a single endpoint.

## What it exposes

The server currently registers five tools:

- `list_meetings`
- `get_transcript`
- `get_summary`
- `list_teams`
- `list_team_members`

It also exposes transcript and summary resources under `fathom://meeting/{id}/...`.

## Local setup

Install dependencies:

```sh
bun install
```

Set the required environment variables:

```env
DATABASE_URL=postgresql://...
APP_ENCRYPTION_KEY=          # base64-encoded 32-byte key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
FATHOM_CLIENT_ID=
FATHOM_CLIENT_SECRET=
```

Prepare the database:

```sh
bun run db:push
```

In the Fathom developer settings, register this redirect URI:

```text
{NEXT_PUBLIC_BASE_URL}/api/integrations/fathom/callback
```

Start the app:

```sh
bun run dev
```

## Using the server

The MCP endpoint is:

```text
{NEXT_PUBLIC_BASE_URL}/mcp
```

Authentication works in two ways:

- OAuth 2.1 with PKCE for MCP clients that support the full flow
- Bearer tokens created from the app dashboard after signing in and connecting Fathom

For bearer-token access, send:

```text
Authorization: Bearer mcp_...
```

## Development notes

- App code lives in `src/`
- The MCP route is `src/app/mcp/route.ts`
- Safe formatting and lint fixes: `bun run check:write`
- Type checking: `bun run typecheck`
- Spelling: `bun run check:spelling`

CI runs typecheck, lint, and spelling checks on pull requests to `main`.
