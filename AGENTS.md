# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. Use `src/app/` for Next.js routes and pages, `src/components/` for UI, `src/server/` for auth, DB, and Fathom integrations, and `src/lib/` for shared utilities. The MCP endpoint is `src/app/mcp/route.ts`; related tools, resources, and schemas live under `src/app/mcp/`. Static assets belong in `public/`. Utility and migration scripts live in `scripts/`.

## Build, Test, and Development Commands

- `bun install` installs dependencies.
- `bun run dev` starts the local Next.js dev server.
- `bun run build` creates a production build.
- `bun run preview` builds and serves the production build locally.
- `bun run typecheck` runs `tsc --noEmit`.
- `bun run check` runs Ultracite checks.
- `bun run check:write` applies safe formatting and lint fixes.
- `bun run check:unsafe` applies unsafe autofixes when needed.
- `bun run check:spelling` runs CSpell.
- `bun run db:generate|db:migrate|db:push|db:studio` manages Drizzle schema work.

## Coding Style & Naming Conventions

Use TypeScript throughout and keep new source files under `src/`. Formatting and linting are handled by Ultracite/Biome, so run `bun run check:write` after edits. Follow existing naming patterns: React components in PascalCase, helpers and route files in lowercase or kebab-case, and shared constants in descriptive camelCase exports. Prefer small, focused modules over large mixed-purpose files.

## Testing Guidelines

There is no dedicated unit test framework configured yet. Treat `bun run typecheck`, `bun run check`, and `bun run check:spelling` as required quality gates, since CI runs all three on pull requests to `main`. If you add tests later, colocate them with the feature or place them in a clearly named test directory and use `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines

Use Conventional Commit style messages, for example `feat: add meeting brief resource` or `fix: handle missing bearer token`. Commitlint enforces this through Lefthook. PRs should include a short description, linked issue when applicable, screenshots for UI changes, and notes for any env or DB changes. Keep PR scope tight and update `bun.lock` whenever dependencies change.

## Configuration Notes

Keep `zod` on the v3 line unless MCP compatibility is intentionally reworked. If route changes make `.next/types` stale, rebuild with `bun run build`. Use Bun instead of `npm`, `pnpm`, or `yarn`.
