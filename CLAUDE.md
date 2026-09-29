# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

SourceDocs turns a GitHub repo URL into generated documentation (README, CHANGELOG,
CONTRIBUTING, LICENSE, CODE_OF_CONDUCT, inline code comments, class diagrams). It ships
two surfaces over the same generators: a Next.js web app and a public HTTP API, plus an
MCP server that wraps the API.

## Commands

```bash
npm install        # root app deps (node_modules is NOT checked in)
npm run dev        # Next.js dev server on :3000
npm run build      # production build
npm run lint       # eslint (flat config, eslint.config.mjs)
npm run build:mcp  # compile packages/mcp with tsc
npx tsc --noEmit   # typecheck without building
```

There is **no test suite** — no test script, no test files. Verify changes with
`npm run lint` and `npx tsc --noEmit`, and by exercising routes in `npm run dev`.

`.github/workflows/main.yml` only mirrors pushes to another remote. CI does **not** lint,
typecheck, build, or test, so run those locally before pushing.

## Layout

```
app/            Next.js App Router — pages and API routes
  api/<type>/   session-authenticated web routes (readme, changelog, license, ...)
  api/v1/       public API-key routes
lib/            all business logic; one module per doc type plus shared infra
components/     client React components (modals, providers)
packages/mcp/   standalone MCP server published as `sourcedocs-mcp`
sql/            analytics queries, run by hand against Supabase — not app code
```

Path alias: `@/*` → repo root (e.g. `import { authOptions } from '@/lib/auth'`).

## Architecture

**Generators.** `lib/claude.ts`, `changelog.ts`, `contributing.ts`, `license.ts`,
`codeofconduct.ts`, `comments.ts`, `class-diagram.ts` each export one
`generate*()` that builds a large prompt and calls the Anthropic SDK. The model id
(`claude-sonnet-4-20250514`) is repeated as a literal in each of these files — change all
of them together.

**Repo ingestion.** `lib/github.ts` — `parseGitHubUrl()` then `fetchRepoData()` (or
`fetchRepoDataForAnalysis`, `fetchCommits`, `fetchReleases`, `fetchTags` for richer types).
Generators receive the fetched data; they never fetch it themselves.

**Two auth paths, do not mix them:**
- Web routes: `getServerSession(authOptions)` → `session.user.githubId` →
  `getUserByGithubId()`. Quota via `canGenerateWeb()`.
- API routes (`app/api/v1/*`): `authenticateApiRequest()` from `lib/api-auth.ts`, which
  requires a `Bearer sk_live_...` key and already enforces the API quota.

**Persistence.** `lib/supabase.ts` exports `supabaseAdmin` built from the service-role key
— server-side only, never import it into a client component. `lib/db.ts` holds every query
plus `PLAN_LIMITS` for the `free` / `web_pro` / `api_pro` / `bundle` plans, where `-1`
means unlimited. `lib/auth.ts` (NextAuth GitHub provider) extends the `Session` and `JWT`
types with `githubId`, `username`, `userId`, `isPro`.

**Billing.** `lib/stripe.ts`, checkout at `app/api/checkout`, and the Stripe webhook at
`app/api/webhook/route.ts` is what actually flips a user's plan.

## Route conventions

Every generation route follows the same shape — keep it when adding one:

1. authenticate (session or API key)
2. validate input, `parseGitHubUrl()`
3. check quota (`canGenerateWeb` / `canGenerateApi`) → `429` with `upgrade: true`
4. record `startTime`, fetch repo data, call the generator
5. `recordGeneration(userId, docType, url, 'web' | 'api', generationTimeMs)`
6. `try/catch` returning a generic `500`; log the real error with `console.error`

Adding a doc type means touching all five: `lib/<type>.ts`, `app/api/<type>/route.ts`,
`VALID_DOC_TYPES` in `app/api/v1/generate/route.ts`, the picker in `app/page.tsx`, and
`validTypes` in `packages/mcp/src/index.ts`. The MCP list is deliberately shorter —
`comments` and `classdiagram` are exposed there as their own tools
(`generate_comments`, `generate_class_diagram`) rather than through `generate_docs`.

## Environment

Required in `.env.local` (none are committed):

| Variable | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | all generators |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | NextAuth — `lib/auth.ts` throws at import if missing |
| `NEXTAUTH_URL` | NextAuth callbacks |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase.ts` |
| `GITHUB_TOKEN` | unauthenticated repo fetches / rate limits |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | billing + webhook |
| `STRIPE_PRICE_WEB_PRO`, `STRIPE_PRICE_API_PRO`, `STRIPE_PRICE_BUNDLE` | checkout price ids |
| `SOURCEDOCS_API_KEY` | `packages/mcp` client |

## Conventions

- TypeScript throughout; export explicit interfaces for route payloads and generator inputs.
- Keep prompts and AI calls in `lib/`, never inline in a route handler.
- Return errors as `NextResponse.json({ error }, { status })`; never leak a raw error
  message or stack to the client.
