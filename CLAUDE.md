# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A React + Vite web app (with Capacitor iOS) for farmers to submit bids on commodities and for admins ("traders") to manage them. Connects to Supabase for auth/data/Edge Functions and deploys to Vercel. Comments and UI copy are largely in Romanian.

## Stack
- Frontend: React 19 + Vite 7 (JSX, not TypeScript)
- Backend: Supabase (Postgres + auth + Realtime + Edge Functions on Deno)
- Mobile: Capacitor iOS (`ios/`)
- Deployment: Vercel (production branch: `main`)
- No test suite/runner is configured in this repo.

## Commands
```bash
npm run dev              # vite dev server
npm run dev:host:5173    # dev server bound to 0.0.0.0:5173 (for iOS dev mode)
npm run build             # production build
npm run lint               # eslint .
npm run preview            # preview a production build

# Capacitor iOS
npm run cap:sync:ios       # sync web build into the iOS project
npm run cap:open:ios       # open the iOS project in Xcode
npm run cap:dev:on/off     # toggle instant hot-reload dev mode on device
npm run cap:live:on/off    # toggle TestFlight "live" mode (loads from a remote URL instead of bundled assets)
```
There's no `test` script — verify changes via `npm run lint`, `npm run build`, and manual/browser checking.

## Environment Setup

### Two Environments
| Environment | Branch | Supabase Project ID | Config File |
|---|---|---|---|
| Development (local) | `develop` | `eirqbksgxiiudgeezlob` (farmer-app-dev) | `.env.local` |
| Production | `main` | `zehwkrndfwjrvqdckepu` (ameropa-farmer) | `.env.production` / Vercel dashboard |

- `.env.local` **always** points to DEV — `https://eirqbksgxiiudgeezlob.supabase.co`
- `.env.production` **always** points to PROD — `https://zehwkrndfwjrvqdckepu.supabase.co`
- Both files are gitignored — never committed. `.env.example` is committed with empty values as a template.
- `VITE_` prefix = exposed to the browser bundle — never put secrets there.
- The root `.env` (also gitignored) holds MySQL credentials for the Ameropa DB, used only by Edge Functions (never imported client-side).

## Branch Strategy
```
develop  →  test locally / preview deploy on Vercel
    ↓
  main   →  production deploy on Vercel (auto on push)
```
- All feature work happens on `develop` or feature branches.
- Only merge to `main` when tested and ready for production.
- Never push directly to `main` for features.

## Architecture

### Auth (`src/hooks/useAuth.jsx`, `src/components/ProtectedRoute.jsx`)
`AuthProvider` wraps the app and drives everything off `supabase.auth.onAuthStateChange`. On each auth event it loads the `profiles` row (for `role`) and the MFA assurance level (AAL) in parallel. Two roles exist: `farmer` and `admin`. Admins are hard-required to enroll TOTP MFA — `App.jsx`'s `DashboardShell` forces `MFASetup`/`MFAVerify` before rendering `AdminDashboard` if an admin hasn't enrolled or isn't at `aal2` yet. If the profile fetch fails, or the profile `status` is `"disabled"`, the user is signed out rather than allowed to fall through with a default role. There's a 5s safety-net timeout that force-signs-out if `onAuthStateChange` never fires (hung token refresh). `ProtectedRoute` gates on `loading`/`user`/optional `requiredRole`. Do not change this flow without discussion — it also handles both PKCE (invite links) and implicit auth flows (`src/pages/SetPassword.jsx`).

### Routing (`src/App.jsx`)
Single `/dashboard` route renders either `FarmerDashboard` or `AdminDashboard` based on `role` — there's no separate admin URL space (`/admin` and `/motherboard` just redirect to `/dashboard`). Dark mode is stored in `localStorage` and can also be driven by a `weather-theme-change` window event dispatched from `WeatherWidget` (day/night syncs the theme).

### Contexts (`src/context/`)
`AppProvider` composes `CommoditiesContext` (prices, realtime price feed, `updateCommodityPrice`). **Bids intentionally have no context** — see the doc comment in `src/context/AppContext.jsx`. Each screen queries exactly what it displays: `BidsTab` paginates with server-side filters, `ActivityTab` fetches only the current farmer's bids, admin execution views fetch only accepted bids. A shared context was tried and dropped because it loaded the entire bids table for every user on every tab visit. `RewardsContext` (farmer points) was removed 2026-09-03 — it wrote to `farmer_rewards.points`/`updated_at`, columns that don't exist on that table (real schema is `reward_type`/`unlocked_at`/`target_t`/`bonus_eur`/...), so every write had failed silently since it was added; nothing read `farmerRewards` either. `FarmerProgress.jsx` (the tonnage progress widget farmers actually see) is unrelated — it computes progress straight from accepted `bids`.

### Bids at scale (`src/pages/AdminDashboard/BidsTab.jsx`)
The admin bids list is built for a large, growing table: explicit column selects (never `select('*')`), `PAGE_SIZE = 50` server-side pagination, dedicated RPCs for aggregates instead of pulling full rows (`bid_stats_rpc`, `bid_counts_rpc`, `bid_filter_options` — see migrations `20260716120000_bid_stats_rpc.sql`, `20260717130000_bid_counts_rpc.sql`, `20260716130000_bid_filter_options.sql`), and indexes added in `20260715120000_bids_scalability_indexes.sql`. `status_changed_at` (migration `20260718120000_bids_status_changed_at.sql`) drives the card date so it reflects the last status transition, not submission time. Keep this pattern (explicit columns, pagination, RPC aggregates) when extending bid-heavy views instead of reintroducing full-table fetches. `FarmiersTab.jsx` (admin farmer list) follows the same pattern since 2026-09-03: keyset pagination on `(created_at, id)` — not `id` alone, since two prod rows share an exact `created_at` — server-side `ilike` search instead of client-side `.filter()`, and a separate `head: true` count query for the header badge. Backed by `idx_profiles_role_created_at`.

### Rate limiting (`rate_limits` table + `check_rate_limit()` RPC)
Fixed-window limiter wired up 2026-09-03 (migration `20260903181726_wire_up_rate_limits.sql`) after sitting unused since March. `check_rate_limit(key, limit, window_seconds)` is `SECURITY DEFINER`, atomic (single `INSERT ... ON CONFLICT DO UPDATE`), and **not** granted to `anon`/`authenticated` — only `service_role`, so a caller can never spoof someone else's key or an inflated limit. Edge Functions call it through `supabase/functions/_shared/rateLimit.ts` (`checkRateLimit(bucket, identity, limit, windowSeconds)`), keyed by `user.id` where the function already authenticates the caller (`exchange-rates`, `gnews`, `invite-farmer`) and by best-effort IP (`clientIdentity()`) where it doesn't (`grain-futures`, `sharp-proxy`). Fails open on infra errors — a `rate_limits` hiccup must not take the feature down with it. `bids` has its own, separate rate limit (`check_bid_rate_limit()` trigger, 5/min + 15/hour per farmer) that counts directly off the `bids` table and was already wired up; this RPC is for everything else.

### Realtime (`src/hooks/useRealtimeSubscription.js`)
Generic hook for subscribing to Postgres changes on a table. Handles reconnection on `CHANNEL_ERROR`/`TIMED_OUT` with exponential backoff, resubscribes on tab visibility change and Capacitor `appStateChange` (app resume), and runs a 20s health check — needed because iOS can silently kill the WebSocket while the WKWebView is suspended without firing either a visibility event or a channel error.

### Edge Functions (`supabase/functions/`, Deno runtime)
- `invite-farmer` — admin invites a new farmer (uses service_role, server-side only); rate-limited 30/hour per admin
- `send-push` — push notification delivery
- `exchange-rates`, `grain-futures`, `gnews` — external data proxies (keeps API keys off the client); all rate-limited (see Rate limiting above)
- `sharp-proxy` — Ameropa Sharp API proxy, **deployed to dev only, not on prod**. `src/services/sharpApi.js` calls it but is itself unused anywhere in `src/` — looks like an unfinished integration, not a live prod dependency. Confirm before deploying it to prod or wiring `sharpApi.js` into a screen.
- `_shared/rateLimit.ts` — not its own function (the `_` prefix excludes it from deployment); shared rate-limit helper imported by the functions above.
- `.github/workflows/supabase-keepalive.yml` pings Supabase on a schedule to prevent the free-tier project from pausing.
- `test-ameropa-db`/`test-mysql` (unauthenticated MySQL connectivity-check functions, publicly invokable with the anon key) were deleted from prod on 2026-08-25, and their source removed from the repo 2026-09-03 — use the local-only `test-ameropa.js` script for the same check instead of re-adding an Edge Function for it.

### Capacitor iOS dev loop
Two independent toggles, don't confuse them: `cap:dev:on` points the bundled iOS app at a local Vite server (instant HMR on-device, requires `dev:host:5173` running and same-WiFi); `cap:live:on <url>` points a TestFlight build at a deployed HTTPS URL so web deploys update the app without a new App Store build. See `README.md` for the full sequences.

## Known Issues / Tech Debt
- [x] ~~PROD OUTAGE 2026-09-03, ~18:12–18:53 UTC: login worked but the app hung right after~~ — `profiles_select_policy` (introduced same day in `20260903180824_rls_performance_optimization.sql`) ordered its OR as `(is_admin(...) AND aal2) OR (id = auth.uid())`. `is_admin(uid)` queries `profiles` for the caller's own row, so evaluating that inner query re-enters `profiles`' own RLS; with the expensive `is_admin()` branch checked first, that inner evaluation never reached the cheap terminating `id = auth.uid()` branch before calling `is_admin()` again — infinite recursion, "stack depth limit exceeded", every `GET /rest/v1/profiles` returned 500. `useAuth.jsx` could never resolve a role, so the app sat frozen after a successful login. Fixed in `20260903185317_fix_profiles_select_recursion.sql` (dev + prod) by putting the self-check first. `bids_select_policy`/`bids_update_policy` had the same expensive-branch-first ordering (not recursive, since `bids` doesn't self-reference, but same footgun) — reordered too in `20260903185414_reorder_bids_policies_cheap_check_first.sql`. **Lesson: when merging an `is_admin(...)` branch with a self-referential owner check into one OR'd RLS policy, the self-check MUST come first** — `is_admin()` always queries the caller's own profile row, so it depends on that same short-circuit to terminate.
- [ ] Prod DB has migrations tracked remotely with no matching local files prior to the `20260325120000_baseline.sql` baseline, which is not reconciled with remote history. Do NOT run `supabase db push` against prod without first running `supabase migration repair`. Confirmed still open (2026-09-03): remote versions `20260716200247`/`20260716210831`/`20260717064904` don't match the local filenames for the same migrations, and remote `20260516071545_secure_send_push` has no local file at all.
- [ ] Leaked password protection (HaveIBeenPwned) not enabled — see `SECURITY_MANUAL_STEPS.md`.
- [ ] `.env` file contains MySQL credentials for Ameropa DB locally — these should be managed as Edge Function secrets via `supabase secrets set`, not a local file. Not verified this session — no `.env` file exists in this checkout (gitignored, local-only), so the actual secret values weren't accessible to move them.
- [x] ~~Supabase performance advisor RLS warnings~~ — mostly fixed in `20260903180824_rls_performance_optimization.sql` (applied dev + prod): wrapped `auth.uid()`/`auth.jwt()`/`is_admin(auth.uid())` in `(select ...)` on `audit_log`, `bids`, `commodities`, `device_tokens.user_own_token_all`, `farmer_rewards`, `profiles`, `silo_price_configs`; merged `bids`/`profiles` duplicate SELECT/UPDATE permissive policies into one OR'd policy each; added the 2 missing FK indexes. Still open, left out on purpose: `device_tokens.service_read_all_tokens` only exists on prod (not on dev — pre-existing drift, see below), and 3 `multiple_permissive_policies` warnings on `commodities`/`silo_price_configs`/`device_tokens` where an admin `ALL` policy overlaps a `true`-qual read policy (needs splitting the `ALL` policy to merge safely).
- [ ] `device_tokens` has an RLS policy (`service_read_all_tokens`) on prod that dev doesn't have — dev/prod policy sets otherwise match exactly (confirmed 2026-09-03).
- [x] ~~`FarmiersTab` fetched the whole `profiles` table with no pagination~~ — fixed 2026-09-03, see "Bids at scale" above.
- [x] ~~`rate_limits` table built but never read or written~~ — fixed 2026-09-03, see "Rate limiting" above.
- [ ] `sharp-proxy` Edge Function exists on dev but was never deployed to prod, and its only client (`src/services/sharpApi.js`) is unused in `src/` — confirm intent (finish wiring it up, or drop the dead pieces) before touching either side.
- [ ] Supabase project upgrade to Pro (automatic daily backups + PITR, connection pooling, higher Realtime connection limits) — not done, requires a billing decision.

## Security Notes
- All Supabase access via anon key (client-side) — service_role key must never be exposed to the browser; it's only used inside Edge Functions.
- RLS policies are security-critical — verify on dev before applying to prod.

## Setup References
- `VERCEL_SETUP.md` — Vercel environment variable configuration
- `SUPABASE_DEV_SETUP.md` — creating/configuring the dev Supabase project
- `SECURITY_MANUAL_STEPS.md` — manual dashboard steps not scriptable via migrations

## What NOT to Change Without Discussion
- Auth flow (`src/hooks/useAuth.jsx`, `src/pages/SetPassword.jsx`, `src/components/ProtectedRoute.jsx`) — handles both PKCE and implicit flows plus MFA gating.
- RLS policies.
- The bids-have-no-context pattern in `src/context/AppContext.jsx` — re-adding a shared bids context was already tried and reverted for scale reasons.
