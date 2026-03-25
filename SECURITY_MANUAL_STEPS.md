# Security Manual Steps — farmer-app

These are security settings that cannot be applied via code/migrations and must be configured manually in the Supabase dashboard.

---

## 1. Enable Leaked Password Protection (HaveIBeenPwned)

**Project:** PROD — `zehwkrndfwjrvqdckepu`

**What it does:** When a user sets or changes their password, Supabase checks it against the HaveIBeenPwned.org database of breached passwords and rejects known compromised passwords.

**Steps:**

1. Go to: https://supabase.com/dashboard/project/zehwkrndfwjrvqdckepu/auth/users
2. Click **Auth** in the left sidebar → **Settings** (or go directly to the Auth config page)
3. Scroll to **Password Security**
4. Enable **"Leaked Password Protection"** (toggle)
5. Save

> Also consider enabling **"Minimum password length"** (recommended: 8+ characters) while you're there.

**Repeat for DEV project:** https://supabase.com/dashboard/project/eirqbksgxiiudgeezlob/auth/users
(Optional for dev, but keeps parity with prod.)

---

## 2. Verify Completed (via Migrations)

These were fixed automatically via Supabase MCP migrations — no manual steps needed:

- [x] `is_admin` — `SET search_path = ''` added (migration `20260325130000`)
- [x] `generate_contract_no` — `SET search_path = ''` added (migration `20260325130000`)
- [x] `assign_contract_no_on_accept` — `SET search_path = ''` added (migration `20260325130000`)
- [x] `handle_new_user` — `SET search_path = ''` added (migration `20260325130000`)
- [x] `rate_limits` RLS — explicit restrictive deny policy added (migration `20260325130001`)
