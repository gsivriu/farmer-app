-- ============================================================
-- Fix mutable search_path on 4 public functions
-- Security advisory: function_search_path_mutable
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- All 4 functions already use fully-qualified public.* names.
-- This migration adds SET search_path = '' to each function definition
-- to prevent schema-injection attacks (especially critical for SECURITY DEFINER).
-- ============================================================

-- 1. is_admin(uid uuid)
--    Purpose: returns true if the given user ID has role='admin' in public.profiles
--    Used by: RLS policies on bids, commodities, profiles, silo_price_configs
--    Language: SQL, STABLE — validated at creation time, requires public.profiles to exist
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

-- 2. generate_contract_no(prefix text)
--    Purpose: generates a sequential contract number like 'AMRP-00042' using contract_seq
--    Used by: assign_contract_no_on_accept trigger
CREATE OR REPLACE FUNCTION public.generate_contract_no(prefix text DEFAULT 'AMRP'::text)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
declare
  n bigint;
begin
  n := nextval('public.contract_seq');
  return prefix || '-' || lpad(n::text, 5, '0');
end;
$$;

-- 3. assign_contract_no_on_accept()
--    Purpose: trigger on public.bids BEFORE UPDATE — auto-assigns a contract number
--             and sets accepted_at when a bid status changes to 'accepted'
--    Used by: trg_assign_contract_no trigger on public.bids
CREATE OR REPLACE FUNCTION public.assign_contract_no_on_accept()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
begin
  if (new.status = 'accepted')
     and (old.status is distinct from new.status)
     and new.contract_no is null then
    new.contract_no := public.generate_contract_no('AMRP');
    new.accepted_at := now();
  end if;
  return new;
end;
$$;

-- 4. handle_new_user()
--    Purpose: trigger on auth.users AFTER INSERT — creates a public.profiles row
--             for every new Supabase auth user with default role='farmer'
--    Security: SECURITY DEFINER — runs with owner privileges, highest risk for
--              mutable search_path. Fixed with SET search_path = '' below.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (NEW.id, NEW.email, 'farmer', 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
