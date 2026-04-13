# MCP Auth Findings

This file captures the current state of the MCP/OAuth work in this repo, the production issue that was found, the reference repos reviewed, and the recommended direction for continuing.

## Current repo state

The app is a Next.js 16 MCP server for Fathom with:

- local user session cookies for browser auth
- Fathom OAuth for upstream API access
- local DB-backed MCP OAuth clients, auth codes, and MCP bearer tokens
- `mcp-handler` for the MCP endpoint
- `@modelcontextprotocol/sdk` now added and used for auth schemas/types/helpers

Important repo notes:

- package manager: `bun`
- formatting/linting: Ultracite/Biome
- `zod` must remain on v3 for MCP compatibility in this repo
- `.next/types` can get stale and break standalone `bun run typecheck`
- `bun run build` is the more reliable validation when `.next/types` is stale

## What was refactored

These files were refactored to use the MCP SDK auth primitives where they fit:

- [src/server/mcp-auth.ts](src/server/mcp-auth.ts)
- [src/server/oauth-flow.ts](src/server/oauth-flow.ts)
- [src/server/auth/oauth.ts](src/server/auth/oauth.ts)
- [src/server/tokens.ts](src/server/tokens.ts)
- [src/app/.well-known/oauth-authorization-server/route.ts](src/app/.well-known/oauth-authorization-server/route.ts)
- [src/app/.well-known/oauth-protected-resource/route.ts](src/app/.well-known/oauth-protected-resource/route.ts)
- [src/app/api/oauth/register/route.ts](src/app/api/oauth/register/route.ts)
- [src/app/api/oauth/token/route.ts](src/app/api/oauth/token/route.ts)
- [src/app/oauth/authorize/page.tsx](src/app/oauth/authorize/page.tsx)
- [src/app/api/integrations/fathom/connect/route.ts](src/app/api/integrations/fathom/connect/route.ts)
- [src/app/api/integrations/fathom/callback/route.ts](src/app/api/integrations/fathom/callback/route.ts)
- [src/app/mcp/route.ts](src/app/mcp/route.ts)

### Shared auth module

`src/server/mcp-auth.ts` now centralizes:

- OAuth metadata via `OAuthMetadataSchema`
- protected resource metadata via `OAuthProtectedResourceMetadataSchema`
- supported MCP scopes: `mcp`
- redirect normalization for loopback URIs (`localhost` / `127.0.0.1`)
- DCR parsing via `OAuthClientMetadataSchema`
- token response shaping via `OAuthTokensSchema`

### OAuth flow helpers

`src/server/oauth-flow.ts` now centralizes:

- cookie handling for Fathom OAuth bridge state
- pending MCP OAuth request persistence
- token request parsing
- standard OAuth error response shaping
- DCR response shaping via `OAuthClientInformationFullSchema`

### Important logic fixes

In `src/server/auth/oauth.ts`:

- redirect URIs are normalized consistently
- auth codes are only marked used after PKCE verification succeeds

In `src/server/tokens.ts`:

- verified MCP tokens now return `scopes: ['mcp']`

In `src/app/oauth/authorize/page.tsx`:

- requested scopes are now checked and unsupported scopes are rejected

In `src/app/api/oauth/register/route.ts`:

- DCR response now includes `client_id_issued_at`

## Production issue found

This was the concrete live bug causing the generic ChatGPT setup failure:

- unauthenticated `GET /mcp` returns `401`
- `WWW-Authenticate` points clients to:
  - `https://fathom-mcp.techwithanirudh.com/.well-known/oauth-protected-resource/mcp`
- that URL returned `404`

That means ChatGPT was being told to discover resource metadata at a path the app did not serve.

### Fix added

Added:

- [src/app/.well-known/oauth-protected-resource/[...resource]/route.ts](src/app/.well-known/oauth-protected-resource/[...resource]/route.ts)

This now serves the suffixed path expected by the SDK challenge URL:

- `/.well-known/oauth-protected-resource/mcp`

The original root endpoint is still served too:

- `/.well-known/oauth-protected-resource`

## Live production findings

At the time of the last inspection, production returned:

### Auth server metadata

`GET /.well-known/oauth-authorization-server`

- issuer on custom domain
- authorization endpoint on custom domain
- token endpoint on custom domain
- registration endpoint on custom domain
- `scopes_supported: ["mcp"]`
- `grant_types_supported: ["authorization_code"]`
- `token_endpoint_auth_methods_supported: ["none"]`
- `code_challenge_methods_supported: ["S256"]`

### Protected resource metadata

`GET /.well-known/oauth-protected-resource`

- `resource: https://fathom-mcp.techwithanirudh.com/mcp`
- `authorization_servers: ["https://fathom-mcp.techwithanirudh.com/"]`
- `scopes_supported: ["mcp"]`
- `bearer_methods_supported: ["header"]`

### DCR

`POST /api/oauth/register` worked and returned a client registration response.

Example behavior:

- request with `http://127.0.0.1:3333/callback`
- response normalized it to `http://localhost:3333/callback`

### Broken path

`GET /.well-known/oauth-protected-resource/mcp`

- returned `404` before the route fix was added locally

## Likely remaining deployment blocker

If ChatGPT still says:

> Something went wrong with setting up the connection

the first thing to confirm is whether the deployed build includes the new route:

```bash
curl -sS https://fathom-mcp.techwithanirudh.com/.well-known/oauth-protected-resource/mcp | jq .
```

Expected:

- JSON protected resource metadata

If it still returns 404, the route fix is not deployed yet.

## Scope recommendation

For this server, the requested scope should be:

- `mcp`

Do not use `openid` unless the app is intentionally upgraded into a real OIDC provider with things like:

- `userinfo`
- `id_token`
- proper OIDC discovery behavior

Current server behavior is OAuth-for-MCP access, not full OIDC.

## Repos reviewed

The following repos were cloned locally and inspected:

- `clerk/mcp-demo`
  - GitHub: `https://github.com/clerk/mcp-demo`
- `NapthaAI/http-oauth-mcp-server`
  - GitHub: `https://github.com/NapthaAI/http-oauth-mcp-server`
- `heroku/mcp-remote-auth-proxy`
  - GitHub: `https://github.com/heroku/mcp-remote-auth-proxy`
- `Azure-Samples/remote-mcp-webapp-python-auth-oauth`
  - GitHub: `https://github.com/Azure-Samples/remote-mcp-webapp-python-auth-oauth`

### Best reference: NapthaAI/http-oauth-mcp-server

Why it is the best fit:

- specifically designed for remote MCP auth
- uses the MCP SDK provider model
- separates upstream OAuth tokens from locally-issued MCP access tokens
- closest to the architecture already used in this repo

Important files reviewed:

- `src/lib/extended-oauth-proxy-provider.ts`
- `src/app.stateless.ts`
- `src/mcp-server.ts`

Key takeaway:

- proxy pattern is strong
- local MCP bearer token + upstream provider token separation is the right architecture for this app

### Best hardening reference: heroku/mcp-remote-auth-proxy

Why it is valuable:

- stronger token lifecycle handling
- refresh/retry behavior
- better adapter separation
- more production-oriented auth proxy implementation

Important files reviewed:

- `lib/use-mcp-server-proxy.js`
- `lib/identity-client-adapter.js`
- `lib/use-interaction-routes-adapter.js`

Important library recommendation from that repo:

- `@heroku/oauth-provider-adapters-for-mcp`

Key takeaway:

- useful if the app evolves into a generic OIDC auth proxy
- likely too heavy for current Fathom-specific flow

### Clerk demo

Why it is not the best fit:

- useful to understand direct resource-server auth
- less aligned with the current local-token architecture
- assumes Clerk-specific auth behavior and a different trust boundary

Key takeaway:

- good conceptual reference
- not the best implementation target for this repo

### Azure sample

Why it is weaker:

- more hand-rolled auth logic
- less compelling as an architecture target

Key takeaway:

- sample only, not the best codebase to copy

## Recommendation

## Libraries and references to use

### Keep using

- `@modelcontextprotocol/sdk`
  - Why:
    - official SDK
    - correct schemas for OAuth metadata, DCR, token responses, protected resource metadata
    - correct auth types and provider abstractions
  - Use it for:
    - `OAuthMetadataSchema`
    - `OAuthProtectedResourceMetadataSchema`
    - `OAuthClientMetadataSchema`
    - `OAuthClientInformationFullSchema`
    - `OAuthTokensSchema`
    - `getOAuthProtectedResourceMetadataUrl`
    - `AuthInfo`
    - `ProxyOAuthServerProvider` only if the app later moves closer to a generic upstream OAuth proxy

- `mcp-handler`
  - Why:
    - already integrated in this repo
    - works well for MCP transport and auth wrapping
  - Keep using it for:
    - `createMcpHandler`
    - `withMcpAuth`
    - metadata CORS helpers

- `fathom-typescript`
  - Why:
    - official or near-official SDK for upstream Fathom OAuth/API operations
  - Keep using it for:
    - upstream authorization URL generation
    - code exchange
    - token store integration
    - meeting API access

### Strong references to take patterns from

- `NapthaAI/http-oauth-mcp-server`
  - GitHub: `https://github.com/NapthaAI/http-oauth-mcp-server`
  - Take reference from:
    - `src/lib/extended-oauth-proxy-provider.ts`
    - local MCP access token issuance
    - separation of upstream OAuth tokens from downstream MCP bearer tokens
    - SDK-native provider structure

- `heroku/mcp-remote-auth-proxy`
  - GitHub: `https://github.com/heroku/mcp-remote-auth-proxy`
  - Take reference from:
    - refresh/retry behavior in `lib/use-mcp-server-proxy.js`
    - identity adapter patterns in `lib/identity-client-adapter.js`
    - interaction route separation in `lib/use-interaction-routes-adapter.js`
    - production hardening and lifecycle handling

### Optional library if the app becomes a generic auth proxy

- `@heroku/oauth-provider-adapters-for-mcp`
  - Mentioned in:
    - `https://github.com/heroku/mcp-remote-auth-proxy`
  - Use only if:
    - the app evolves into a general OIDC/OAuth proxy
    - upstream identity providers become more standardized
    - the goal is to reduce custom provider glue for non-Fathom providers
  - Do not add it yet if:
    - this remains a Fathom-specific app
    - the auth flow still depends on custom login/session bridging and app-local consent logic

### Do not use as the main architecture reference

- `clerk/mcp-demo`
  - GitHub: `https://github.com/clerk/mcp-demo`
  - Why not:
    - useful conceptually
    - not the best fit for the current local-token architecture
    - more direct-resource-token oriented than this repo should be

- `Azure-Samples/remote-mcp-webapp-python-auth-oauth`
  - GitHub: `https://github.com/Azure-Samples/remote-mcp-webapp-python-auth-oauth`
  - Why not:
    - more hand-rolled auth code
    - weaker implementation target
    - better as a sample than as a reference architecture

### Use the MCP SDK more, but not blindly

The MCP SDK is the correct dependency to keep using for:

- metadata schemas
- DCR schemas
- token response schemas
- protected resource metadata helpers
- auth types
- provider abstractions where they fit

### What should stay custom

These parts are app-specific and should not be force-fit into a generic SDK abstraction:

- Fathom login/session bridging
- consent/auth page flow
- DB-backed auth code storage
- local MCP token issuance and verification

That code is not “missing SDK usage”; it is the Fathom-specific adapter layer.

### Best architecture direction

Keep:

- local MCP token model
- Fathom upstream OAuth token storage
- current Next.js app as both UI and MCP resource server

Use as design references:

- primary: `NapthaAI/http-oauth-mcp-server`
- secondary hardening: `heroku/mcp-remote-auth-proxy`

Avoid:

- rewriting toward Clerk-demo style direct upstream tokens
- adding a heavy generic OIDC adapter library unless the app becomes a true auth proxy product

## Validation commands

Repo validation used during this work:

```bash
bun run check:write
bun run build
bun run typecheck
```

Notes:

- `bun run build` passed after the latest changes
- standalone `bun run typecheck` may fail if `.next/types` is stale
- if that happens, rebuild first:

```bash
bun run build
bun run typecheck
```

## Live debugging commands

Useful production checks:

```bash
curl -sS https://fathom-mcp.techwithanirudh.com/.well-known/oauth-authorization-server | jq .
curl -sS https://fathom-mcp.techwithanirudh.com/.well-known/oauth-protected-resource | jq .
curl -sS https://fathom-mcp.techwithanirudh.com/.well-known/oauth-protected-resource/mcp | jq .
curl -sSI https://fathom-mcp.techwithanirudh.com/mcp
curl -sS -X POST https://fathom-mcp.techwithanirudh.com/api/oauth/register -H 'content-type: application/json' --data '{"client_name":"Test Client","redirect_uris":["http://127.0.0.1:3333/callback"],"grant_types":["authorization_code"],"response_types":["code"],"token_endpoint_auth_method":"none","scope":"mcp"}' | jq .
```

## Next steps

1. Deploy the current branch.
2. Verify that `/.well-known/oauth-protected-resource/mcp` returns JSON instead of 404.
3. Retry ChatGPT app setup with scope `mcp`.
4. If setup still fails, inspect the browser auth flow end-to-end:
   - DCR
   - authorize redirect
   - Fathom connect redirect
   - callback back to client redirect URI
5. If further hardening is needed, borrow ideas from:
   - Naptha’s `ExtendedProxyOAuthServerProvider`
   - Heroku’s token refresh/retry flow

## Current uncommitted files

At the end of the last local pass, these files were modified:

- `src/app/api/oauth/register/route.ts`
- `src/app/oauth/authorize/page.tsx`
- `src/server/auth/oauth.ts`
- `src/server/mcp-auth.ts`
- `src/server/oauth-flow.ts`
- `src/app/.well-known/oauth-protected-resource/[...resource]/route.ts`

## One unrelated warning

`bun run check:write` still reports an existing broken symlink:

- `.claude/skills/deploy-to-vercel`

That warning is unrelated to the MCP auth work.
