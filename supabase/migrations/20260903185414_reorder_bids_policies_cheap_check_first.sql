-- Same ordering fix as profiles_select_policy, applied here for consistency and
-- actual perf (the point of today's optimization): put the cheap owner check first
-- so the common case (farmer reading/updating their own bid) never needs to call
-- is_admin() at all. Doesn't fix a recursion bug here (bids doesn't self-reference),
-- but avoids the same expensive-branch-first footgun.
drop policy if exists bids_select_policy on public.bids;
create policy bids_select_policy on public.bids
  for select
  using (
    (((select auth.uid()) = farmer_id) and is_active_farmer((select auth.uid())))
    or
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
  );

drop policy if exists bids_update_policy on public.bids;
create policy bids_update_policy on public.bids
  for update
  using (
    (((select auth.uid()) = farmer_id) and (status = 'countered') and is_active_farmer((select auth.uid())))
    or
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
  )
  with check (
    (((select auth.uid()) = farmer_id) and (status = any (array['farmer_countered','accepted','rejected'])) and is_active_farmer((select auth.uid())))
    or
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
  );
