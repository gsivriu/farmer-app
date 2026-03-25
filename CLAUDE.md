# farmer-app — Claude Context

## Project Overview
A React + Vite web app (with Capacitor iOS) for farmers to manage bids, commodities, and activity. Connects to Supabase for auth and data, deployed on Vercel.

## Stack
- Frontend: React + Vite (JSX, not TypeScript)
- Backend: Supabase (auth, database, Edge Functions)
- Mobile: Capacitor iOS
- Deployment: Vercel (production branch: `main`)

## Environment Setup

### Two Environments
| Environment | Branch | Supabase Project ID | Config File |
|---|---|---|---|
| Development (local) | `develop` | `eirqbksgxiiudgeezlob` (farmer-app-dev) | `.env.local` |
| Production | `main` | `zehwkrndfwjrvqdckepu` (ameropa-farmer) | `.env.production` / Vercel dashboard |

- `.env.local` **always** points to DEV — `https://eirqbksgxiiudgeezlob.supabase.co`
- `.env.production` **always** points to PROD — `https://zehwkrndfwjrvqdckepu.supabase.co`
- Both files are gitignored — never committed
- `.env.example` is committed with empty values as a template

### Supabase Project IDs
- **PRODUCTION**: `zehwkrndfwjrvqdckepu` → https://zehwkrndfwjrvqdckepu.supabase.co
- **DEVELOPMENT**: `eirqbksgxiiudgeezlob` → https://eirqbksgxiiudgeezlob.supabase.co

## Branch Strategy
```
develop  →  test locally / preview deploy on Vercel
    ↓
  main   →  production deploy on Vercel (auto on push)
```

- All feature work happens on `develop` or feature branches
- Only merge to `main` when tested and ready for production
- Never push directly to `main` for features

## Key Files
- `src/supabaseClient.js` — single Supabase client instance (uses `import.meta.env` vars)
- `src/App.jsx` — main app with routing
- `src/hooks/useAuth.jsx` — authentication hook
- `src/context/` — React contexts (Bids, Commodities, Rewards)
- `src/pages/` — page-level components
- `supabase/functions/` — Edge Functions (Deno runtime)
- `VERCEL_SETUP.md` — manual Vercel dashboard setup instructions
- `SUPABASE_DEV_SETUP.md` — instructions to create and configure the dev Supabase project

## Setup References
- See `VERCEL_SETUP.md` for Vercel environment variable configuration
- See `SUPABASE_DEV_SETUP.md` for creating the dev Supabase project

## Current Sprint / Active Work
Dev/prod environment split complete as of 2026-03-25.
- Both Supabase projects provisioned and schema-matched
- Baseline migration in `supabase/migrations/20260325120000_baseline.sql`
- `develop` branch created locally (not yet pushed)
- Next: configure Vercel env vars per environment (see `VERCEL_SETUP.md`)

## Known Issues / Tech Debt
- [ ] Prod DB has 11 migrations tracked remotely but no matching local files. Baseline (`20260325120000_baseline.sql`) captures the full schema but is not reconciled with remote history. Do NOT run `supabase db push` against prod without first running `supabase migration repair`.
- [ ] 4 DB functions missing `SET search_path = ''` (security advisory): `is_admin`, `generate_contract_no`, `assign_contract_no_on_accept`, `handle_new_user`. Fix on dev first, then migrate to prod.
- [ ] `vercel.json` missing security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] `.env` file contains MySQL credentials for Ameropa DB — these should be managed as Edge Function secrets via `supabase secrets set`, not a local file

## Security Notes
- All Supabase access via anon key (client-side) — service_role key must never be exposed to the browser
- Supabase auth uses PKCE flow (invite links + password set)
- MySQL credentials (Ameropa DB) live in `.env` (gitignored) — used by Edge Functions only
- `VITE_` prefix = exposed to browser bundle — never put secrets there

## What NOT to Change Without Discussion
- Auth flow (`src/hooks/useAuth.jsx`, `src/pages/SetPassword.jsx`) — complex, handles both PKCE and implicit flows
- RLS policies — security-critical, verify on dev before applying to prod
