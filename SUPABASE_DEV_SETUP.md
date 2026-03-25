# Supabase Dev Project Setup — farmer-app-dev

Follow these steps to create a separate development Supabase project and wire it up locally.

---

## 1. Create the Dev Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Name it: `farmer-app-dev`
4. Choose the same region as your production project
5. Set a strong database password (save it — you'll need it for migrations)
6. Wait for the project to finish provisioning

---

## 2. Get the Dev Project Credentials

Once the project is ready:

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → this is your `VITE_SUPABASE_URL`
   - **anon / public key** → this is your `VITE_SUPABASE_ANON_KEY`

---

## 3. Export Schema from Production

Since migrations are not yet tracked locally, export the current production schema:

```bash
# Install Supabase CLI if not already installed
brew install supabase/tap/supabase

# Login
supabase login

# Link to production project and dump schema
supabase db dump --project-ref zehwkrndfwjrvqdckepu -f prod_schema.sql
```

> This creates `prod_schema.sql` in the current directory.

---

## 4. Apply Schema to Dev Project

```bash
# Link CLI to the new dev project (get the project ref from the Supabase dashboard URL)
supabase link --project-ref <YOUR_DEV_PROJECT_REF>

# Apply the schema dump to dev
psql "postgresql://postgres:<DB_PASSWORD>@db.<YOUR_DEV_PROJECT_REF>.supabase.co:5432/postgres" \
  -f prod_schema.sql
```

Alternatively, use the Supabase SQL editor in the dashboard to paste and run the schema dump.

---

## 5. Set Up Local Migrations (for future changes)

Start tracking migrations going forward:

```bash
mkdir -p supabase/migrations

# Pull current remote schema as the baseline migration
supabase db pull --schema public
```

This creates a timestamped `.sql` file in `supabase/migrations/` representing the current state.
Commit this file — it becomes the baseline for all future schema changes.

---

## 6. Fill In `.env.local`

Open `.env.local` and replace the placeholders with your new dev project values:

```
VITE_SUPABASE_URL="https://<YOUR_DEV_PROJECT_REF>.supabase.co"
VITE_SUPABASE_ANON_KEY="<YOUR_DEV_ANON_KEY>"
VITE_ENV="development"
```

---

## 7. Verify

```bash
npm run dev
```

Check the browser console — you should see:

```
[supabase] Connected to: https://<YOUR_DEV_PROJECT_REF>.supabase.co
```

If you see the production URL (`zehwkrndfwjrvqdckepu`), check that `.env.local` was saved correctly and restart the dev server.

---

## Important Notes

- **Never** test against production data in dev
- The dev project is disposable — you can wipe and re-seed it freely
- Add a `supabase/seed.sql` file with test data for consistent local state
- Always run and verify migrations on dev before applying to production (`zehwkrndfwjrvqdckepu`)
