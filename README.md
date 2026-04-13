# Fathom MCP Server

An MCP server that gives Claude (and other MCP clients) access to your [Fathom](https://fathom.video) meeting recordings, transcripts, summaries, and team data.

Built with Next.js 16 and [`mcp-handler`](https://www.npmjs.com/package/mcp-handler).

## Features

- **OAuth 2.1** with PKCE — clients like Claude Desktop authenticate without manual token setup
- **Bearer token auth** — create named tokens in the dashboard for API/script use
- **5 tools** — list meetings, get transcripts, get summaries, list teams and members
- **2 resources** — meeting transcripts and summaries accessible via `fathom://meeting/{id}/transcript` and `fathom://meeting/{id}/summary`
- **Structured output** — all tools return typed `structuredContent` alongside text

## Tools

| Tool | Description |
|------|-------------|
| `list_meetings` | List recordings with optional transcript, summary, and action item inclusion |
| `get_transcript` | Full speaker-labelled transcript for a recording |
| `get_summary` | AI-generated summary for a recording |
| `list_teams` | List workspace teams |
| `list_team_members` | List members of a team |

## Setup

### 1. Environment variables

```env
DATABASE_URL=postgresql://...
APP_ENCRYPTION_KEY=          # 32 bytes, base64-encoded
NEXT_PUBLIC_BASE_URL=        # e.g. https://your-tunnel.trycloudflare.com
FATHOM_CLIENT_ID=
FATHOM_CLIENT_SECRET=
```

### 2. Database

```sh
bun run db:push
```

### 3. Fathom OAuth app

In your Fathom developer settings, register a redirect URI:

```
{NEXT_PUBLIC_BASE_URL}/api/integrations/fathom/callback
```

### 4. Run

```sh
bun install
bun run dev
```

## MCP endpoint

```
{NEXT_PUBLIC_BASE_URL}/mcp
```

Point your MCP client here. The server supports both OAuth 2.1 (for clients like Claude Desktop) and bearer token auth.

### Bearer token

Sign in at `{NEXT_PUBLIC_BASE_URL}`, connect Fathom, then create a token on the dashboard. Pass it as:

```
Authorization: Bearer mcp_...
```

## Development

```sh
bun run dev          # dev server
bun run build        # production build
bun run typecheck    # type checking
bun run check:write  # lint + format
bun run check:unsafe # lint + format (unsafe fixes)
```
