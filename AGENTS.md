# Agent Notes

## Stack

- Next.js 16
- React 19
- TypeScript 6
- Bun for package management and scripts
- `mcp-handler` for the MCP route
- `zod@3` pinned for MCP compatibility

## Project Layout

- App code lives under `src/`
- MCP endpoint: `src/app/mcp/route.ts`
- Static assets: `public/`
- Utility scripts: `scripts/`

## Commands

- Install deps: `bun install`
- Dev server: `bun run dev`
- Build: `bun run build`
- Preview prod build: `bun run preview`
- Typecheck: `bun run typecheck`
- Lint/check: `bun run check`
- Safe autofix: `bun run check:write`
- Unsafe autofix: `bun run check:unsafe`
- Spelling: `bun run check:spelling`

## Quality Gates

- Formatting and linting are handled by Ultracite/Biome
- Spelling is handled by CSpell
- Commit messages are enforced by Commitlint through Lefthook
- CI runs typecheck, lint, and spelling checks on pull requests to `main`

## Rules

- Prefer Bun commands over `npm`, `pnpm`, or `yarn`
- Keep source files under `src/`
- Do not reintroduce ESLint config; this repo uses Ultracite only
- Keep `zod` on the v3 line unless MCP compatibility is explicitly reworked
- Run `bun run check:write` after code changes
- If dependencies change, update `bun.lock`

## GitHub Setup

- Workflow: `.github/workflows/ci.yml`
- Shared action: `.github/actions/setup/action.yml`
- Claude hook config: `.github/hooks/ultracite.json`

## Known Notes

- `typecheck` can depend on generated Next.js types in `.next/`
- If `.next/types` is stale after moving routes, rebuild with `bun run build`
- There is currently no configured Git remote in this checkout unless added manually
