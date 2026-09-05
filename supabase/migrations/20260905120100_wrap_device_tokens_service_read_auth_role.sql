-- service_read_all_tokens (prod only, see CLAUDE.md Known Issues drift note)
-- was missed by 20260903180824_rls_performance_optimization.sql because it
-- doesn't exist on dev, where that migration was authored and tested.
-- Wraps auth.role() in (select ...) so it's evaluated once per statement
-- instead of once per row, closing the last auth_rls_initplan warning.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'device_tokens' and policyname = 'service_read_all_tokens'
  ) then
    alter policy service_read_all_tokens on public.device_tokens
      using ((select auth.role()) = 'service_role');
  end if;
end $$;
