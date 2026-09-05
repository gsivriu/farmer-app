-- Wrap auth.<fn>() calls in RLS policies with (select auth.<fn>()) so Postgres
-- evaluates them once per statement instead of once per row (Supabase perf
-- advisor: auth_rls_initplan). Also merge same-command permissive policy
-- pairs on bids and profiles into a single OR'd policy (multiple_permissive_policies).
-- No security semantics change: every merged policy is a straight boolean OR
-- of the two original quals/with_checks it replaces.
--
-- Intentionally NOT touched (left as pre-existing tech debt, tracked in
-- CLAUDE.md Known Issues):
--   - device_tokens.service_read_all_tokens: exists on prod only, not on dev
--     (baseline drift) — wrapping it here would have created it fresh on dev
--     with different semantics than "dev/prod already matched". Fix as its
--     own migration once the dev/prod drift on this table is reconciled.
--   - commodities/silo_price_configs/device_tokens "multiple permissive
--     policies" from an admin ALL policy overlapping a `true` read policy:
--     merging cleanly requires splitting the ALL policy into per-command
--     policies. Left out of this pass to keep the diff to same-command,
--     provably-equivalent merges only.

-- audit_log
drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select
  using (is_admin((select auth.uid())));

-- bids: merge admin_select_all_bids + farmer_select_own_bids
drop policy if exists admin_select_all_bids on public.bids;
drop policy if exists farmer_select_own_bids on public.bids;
create policy bids_select_policy on public.bids
  for select
  using (
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
    or
    (((select auth.uid()) = farmer_id) and is_active_farmer((select auth.uid())))
  );

-- bids: merge admin_update_all_bids + farmer_update_own_bids
drop policy if exists admin_update_all_bids on public.bids;
drop policy if exists farmer_update_own_bids on public.bids;
create policy bids_update_policy on public.bids
  for update
  using (
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
    or
    (((select auth.uid()) = farmer_id) and (status = 'countered') and is_active_farmer((select auth.uid())))
  )
  with check (
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
    or
    (((select auth.uid()) = farmer_id) and (status = any (array['farmer_countered','accepted','rejected'])) and is_active_farmer((select auth.uid())))
  );

-- bids: wrap-only, no merge needed (single INSERT policy)
drop policy if exists farmer_insert_own_bids on public.bids;
create policy farmer_insert_own_bids on public.bids
  for insert
  with check (((select auth.uid()) = farmer_id) and is_active_farmer((select auth.uid())));

-- commodities: wrap-only
drop policy if exists admin_write_commodities on public.commodities;
create policy admin_write_commodities on public.commodities
  for all
  using (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
  with check (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'));

-- device_tokens: wrap-only (user_own_token_all exists on both dev & prod;
-- service_read_all_tokens is prod-only and intentionally left untouched here)
drop policy if exists user_own_token_all on public.device_tokens;
create policy user_own_token_all on public.device_tokens
  for all
  using (((select auth.uid()) = user_id) and is_active_farmer((select auth.uid())))
  with check (((select auth.uid()) = user_id) and is_active_farmer((select auth.uid())));

-- farmer_rewards: wrap-only
drop policy if exists farmer_rewards_select_own on public.farmer_rewards;
create policy farmer_rewards_select_own on public.farmer_rewards
  for select
  using (((farmer_id = (select auth.uid())) and is_active_farmer((select auth.uid()))));

-- profiles: merge admin_read_all_profiles + users_can_read_own_profile
drop policy if exists admin_read_all_profiles on public.profiles;
drop policy if exists users_can_read_own_profile on public.profiles;
create policy profiles_select_policy on public.profiles
  for select
  to authenticated
  using (
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
    or
    (id = (select auth.uid()))
  );

-- profiles: wrap-only
drop policy if exists admin_update_profiles on public.profiles;
create policy admin_update_profiles on public.profiles
  for update
  using (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
  with check (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'));

-- silo_price_configs: wrap-only
drop policy if exists admin_write_silo_prices on public.silo_price_configs;
create policy admin_write_silo_prices on public.silo_price_configs
  for all
  using (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
  with check (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'));

-- missing FK indexes (Supabase perf advisor: unindexed_foreign_keys)
create index if not exists idx_farmer_rewards_farmer_id on public.farmer_rewards (farmer_id);
create index if not exists idx_profiles_invited_by on public.profiles (invited_by);
