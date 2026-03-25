# Vercel Setup Guide — farmer-app

This document describes the manual steps to configure Vercel for the two-environment setup.

---

## 1. Set the Production Branch

1. Go to your project in the Vercel dashboard → **Settings** → **Git**
2. Under **Production Branch**, set it to `main`
3. Save changes

> Any push to `main` will deploy to Production.
> Any push to `develop` (or other branches) will deploy to Preview.

---

## 2. Add Environment Variables per Environment

Go to **Settings** → **Environment Variables**.

Add each variable **separately** per environment using the environment selector (Production / Preview / Development).

### Variables to set

| Variable | Production | Preview (develop branch) |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://zehwkrndfwjrvqdckepu.supabase.co` | `https://<your-dev-project>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | _(prod anon key — see below)_ | _(dev anon key — see below)_ |
| `VITE_ENV` | `production` | `development` |

### Where to find the values

**Production (project: `zehwkrndfwjrvqdckepu`)**
- Go to: https://supabase.com/dashboard/project/zehwkrndfwjrvqdckepu/settings/api
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = `anon` / `public` key (NOT the service_role key)

**Preview/Dev (project: `farmer-app-dev` — create this first, see SUPABASE_DEV_SETUP.md)**
- Go to that project's Settings → API
- Copy the same two values

---

## 3. How to Add Each Variable Separately per Environment

In the Vercel dashboard "Add Variable" dialog:

1. Enter the variable name (e.g. `VITE_SUPABASE_URL`)
2. Enter the value
3. **Uncheck** the environments you don't want it applied to
4. Add a separate entry for each environment with different values

Repeat for each variable in the table above.

---

## 4. Verify

After setting variables:
1. Trigger a new deploy on `main` → check that the production app uses `zehwkrndfwjrvqdckepu`
2. Trigger a new deploy on `develop` → check that the preview app uses the dev project URL
3. The browser console will log `[supabase] Connected to: <url>` in development/preview builds

---

## Notes

- **Never** add `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_` prefixed variable — it would be exposed to the browser
- The `VERCEL_OIDC_TOKEN` in `.env.local` is auto-managed by Vercel CLI and must not be set manually
- `.env.production` on the filesystem is for local production builds only (`vite build`) — Vercel uses the dashboard values in CI/CD
