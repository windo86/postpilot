# AGENTS.md — PostPilot

## Source of truth

- `.agents/2-TECH-SPEC.md` = implementation truth. `.agents/1-PRD.md` = scope.
  If code and docs conflict, change the code to match the Tech Spec.
- `.agents/3-TASKS.md` = execution order. Work **one task at a time** (T-00 → T-21).
  A task is `Done` only when: typecheck + lint clean, relevant tests pass,
  manual UI/API flow tested if touched, no critical TODOs left behind.

## Architecture (two processes, one repo)

- **Web Service**: Next.js 16 App Router (`app/`). Auth/validation/enqueue only —
  web routes must NEVER do synchronous external publish (Instagram/TikTok).
- **Background Worker**: `worker/index.ts`, run via `npm run worker` (tsx).
  Sole owner of queue claim, platform publish, status polling, token refresh,
  analytics refresh, failure emails, stale-job recovery.
- **Shared code** (`lib/crypto`, `lib/platforms`, `lib/queue`, `lib/validators`,
  `lib/ai`, `lib/db` repository logic) must be importable without Next.js:
  no `next/*`, no UI components, no browser-only APIs. Worker crashes otherwise.

## Database — no ORM

- Access via `@supabase/supabase-js` with the repository pattern: repositories take
  an injected client, never create singletons (Tech Spec §4).
- Schema lives in `supabase/migrations/` (`0001` schema, `0002` indexes+RLS,
  `0003` queue RPCs). Deploy with `supabase db push --linked`. No local
  container DB required for development.
- RLS on all user-owned tables (`user_id = auth.uid()`); queue claim/recovery
  must be atomic Postgres functions (`FOR UPDATE SKIP LOCKED`), never
  multi-step client updates.
- Key invariants: `post_platforms` lifecycle is per-platform (IG success must not
  mask TikTok failure); retry max 3 total, transient-only, backoff+jitter;
  every attempt logged to `publish_attempts` (sanitized, no secrets);
  unverifiable external state → `unknown_publish_state`, never blind retry.

## Supabase clients — do not mix

- `lib/supabase/client.ts` — browser (publishable key, RLS). Only client-safe import.
- `lib/supabase/server.ts` — SSR cookie flow for Server Components/Actions/Routes.
- `lib/supabase/service.ts` — service-role, bypasses RLS. Server/worker only,
  enforced by the `server-only` package. Never expose to the browser.
- `lib/supabase/service-client.ts` — same factory WITHOUT `server-only`
  (the package throws under plain Node). Worker imports this one; app code
  imports `./service`. Worker also loads `.env.local` itself via a tiny
  parser in `worker/index.ts` (Next.js does it automatically, tsx does not).

## Env

- Copy `.env.example` → `.env.local` (never committed; gitignore whitelists only
  `.env.example`). Key names: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not ANON),
  `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY` (32-byte hex), `MEDIA_BUCKET`,
  `WORKER_POLL_INTERVAL_MS`. Model IDs and platform limits are config, never hardcoded.

## npm notes (Windows)

- npm v11+ blocks unknown packages' install scripts by default. If `npm install`
  warns about blocked scripts, review with `npm install-scripts ls` and approve
  legitimate ones (`npm install-scripts approve <pkg>`) — approvals are stored
  per-project in `package.json`. Never approve blindly.
- shadcn preset is `base-nova`: components use `@base-ui/react` (not Radix) and
  `cn` from the **`cn` npm package** — install it first (`npm install cn`),
  then `npx shadcn@latest add <component>`. Theme tokens live in
  `app/globals.css` (Tailwind v4 + `tw-animate-css`); path alias `@/*`.

  invoke 'frontend-design' and 'ui-ux-pro-max' skills.

## Verify

Order: `npm run typecheck` → `npm run lint` → `npm run build`.
Worker smoke test: `WORKER_POLL_INTERVAL_MS=1000 npm run worker` must print
`[worker] starting` (it idles silently when queue empty, logs on activity;
kill it after — it runs forever by design).
`npm run dev` for UI work. No test runner configured yet (vitest/playwright
arrive with later tasks — follow Tech Spec §20 when adding).
