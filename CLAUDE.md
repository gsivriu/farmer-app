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
`AppProvider` composes `CommoditiesContext` (prices, realtime price feed, `updateCommodityPrice`) and `RewardsContext` (farmer points). **Bids intentionally have no context** — see the doc comment in `src/context/AppContext.jsx`. Each screen queries exactly what it displays: `BidsTab` paginates with server-side filters, `ActivityTab` fetches only the current farmer's bids, admin execution views fetch only accepted bids. A shared context was tried and dropped because it loaded the entire bids table for every user on every tab visit.

### Bids at scale (`src/pages/AdminDashboard/BidsTab.jsx`)
The admin bids list is built for a large, growing table: explicit column selects (never `select('*')`), `PAGE_SIZE = 50` server-side pagination, dedicated RPCs for aggregates instead of pulling full rows (`bid_stats_rpc`, `bid_counts_rpc`, `bid_filter_options` — see migrations `20260716120000_bid_stats_rpc.sql`, `20260717130000_bid_counts_rpc.sql`, `20260716130000_bid_filter_options.sql`), and indexes added in `20260715120000_bids_scalability_indexes.sql`. `status_changed_at` (migration `20260718120000_bids_status_changed_at.sql`) drives the card date so it reflects the last status transition, not submission time. Keep this pattern (explicit columns, pagination, RPC aggregates) when extending bid-heavy views instead of reintroducing full-table fetches.

### Realtime (`src/hooks/useRealtimeSubscription.js`)
Generic hook for subscribing to Postgres changes on a table. Handles reconnection on `CHANNEL_ERROR`/`TIMED_OUT` with exponential backoff, resubscribes on tab visibility change and Capacitor `appStateChange` (app resume), and runs a 20s health check — needed because iOS can silently kill the WebSocket while the WKWebView is suspended without firing either a visibility event or a channel error.

### Edge Functions (`supabase/functions/`, Deno runtime)
- `invite-farmer` — admin invites a new farmer (uses service_role, server-side only)
- `send-push` — push notification delivery
- `exchange-rates`, `grain-futures`, `sharp-proxy`, `gnews` — external data proxies (keeps API keys off the client)
- `.github/workflows/supabase-keepalive.yml` pings Supabase on a schedule to prevent the free-tier project from pausing.
- `test-ameropa-db`/`test-mysql` (unauthenticated MySQL connectivity-check functions, publicly invokable with the anon key) were deleted from prod on 2026-08-25 — use the local-only `test-ameropa.js` script for the same check instead of re-adding an Edge Function for it.

### Capacitor iOS dev loop
Two independent toggles, don't confuse them: `cap:dev:on` points the bundled iOS app at a local Vite server (instant HMR on-device, requires `dev:host:5173` running and same-WiFi); `cap:live:on <url>` points a TestFlight build at a deployed HTTPS URL so web deploys update the app without a new App Store build. See `README.md` for the full sequences.

## Known Issues / Tech Debt
- [ ] Prod DB has migrations tracked remotely with no matching local files prior to the `20260325120000_baseline.sql` baseline, which is not reconciled with remote history. Do NOT run `supabase db push` against prod without first running `supabase migration repair`. Confirmed still open (2026-09-03): remote versions `20260716200247`/`20260716210831`/`20260717064904` don't match the local filenames for the same migrations, and remote `20260516071545_secure_send_push` has no local file at all.
- [ ] Leaked password protection (HaveIBeenPwned) not enabled — see `SECURITY_MANUAL_STEPS.md`.
- [ ] `.env` file contains MySQL credentials for Ameropa DB locally — these should be managed as Edge Function secrets via `supabase secrets set`, not a local file.
- [ ] Supabase performance advisor (2026-09-03) flags ~20 RLS warnings on prod: several policies on `profiles`, `bids`, `commodities`, `device_tokens`, `audit_log`, `silo_price_configs` call `auth.uid()`/`auth.jwt()`/`is_admin(auth.uid())` unwrapped, re-evaluated per row instead of once via `(select auth.<fn>())`; several tables also carry overlapping permissive policies for the same role/action (admin policy + owner policy both matching). Also 2 missing FK indexes (`farmer_rewards.farmer_id`, `profiles.invited_by`).

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
