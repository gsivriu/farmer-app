-- Fixes the 3 remaining "multiple_permissive_policies" advisor warnings left
-- open in ARCHITECTURE.md 4.4/12 after the 2026-09-03 RLS performance pass.
--
-- commodities / silo_price_configs: the admin policy was declared FOR ALL,
-- so its SELECT branch is evaluated on every read alongside the dedicated
-- true-qual read policy, for every role. Splitting it into INSERT/UPDATE/
-- DELETE removes the SELECT overlap; admin SELECTs already go through the
-- read policy (qual = true for any authenticated user), so this changes
-- policy count, not behavior.
drop policy if exists admin_write_commodities on public.commodities;

create policy admin_insert_commodities on public.commodities
  for insert to authenticated
  with check (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2');

create policy admin_update_commodities on public.commodities
  for update to authenticated
  using (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2')
  with check (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2');

create policy admin_delete_commodities on public.commodities
  for delete to authenticated
  using (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2');

drop policy if exists admin_write_silo_prices on public.silo_price_configs;

create policy admin_insert_silo_prices on public.silo_price_configs
  for insert to authenticated
  with check (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2');

create policy admin_update_silo_prices on public.silo_price_configs
  for update to authenticated
  using (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2')
  with check (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2');

create policy admin_delete_silo_prices on public.silo_price_configs
  for delete to authenticated
  using (is_admin((select auth.uid())) and ((select auth.jwt()) ->> 'aal') = 'aal2');

-- device_tokens: both policies were declared for {public} (every role), so
-- SELECT was evaluated under both for every role even though their quals
-- already restrict them to service_role and authenticated respectively.
-- Scoping the roles explicitly (no qual change) removes the overlap.
-- service_read_all_tokens only exists on prod (documented drift in
-- ARCHITECTURE.md/CLAUDE.md Known Issues), so guard it.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'device_tokens' and policyname = 'service_read_all_tokens'
  ) then
    alter policy service_read_all_tokens on public.device_tokens to service_role;
  end if;
end $$;

alter policy user_own_token_all on public.device_tokens to authenticated;
