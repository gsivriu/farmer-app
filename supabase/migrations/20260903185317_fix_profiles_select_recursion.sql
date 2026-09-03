-- INCIDENT FIX: profiles_select_policy (added in 20260903180824_rls_performance_optimization.sql)
-- put the is_admin() branch first in its OR:
--   (is_admin((select auth.uid())) AND aal2) OR (id = (select auth.uid()))
--
-- is_admin(uid) always checks the CALLER'S OWN row (`select 1 from profiles where
-- id = uid`), so evaluating that inner query re-enters profiles' own RLS. If the
-- expensive is_admin() branch is checked first, the inner query re-evaluates the
-- same policy and calls is_admin() again before ever reaching the cheap, terminating
-- `id = auth.uid()` branch — infinite recursion. Confirmed live in prod: every
-- `GET /rest/v1/profiles` after login returned 500 ("stack depth limit exceeded"),
-- which meant useAuth.jsx could never load a role and the app hung right after
-- sign-in. Reproduced directly with SET ROLE authenticated + request.jwt.claims.
--
-- Fix: put the cheap self-check first so it short-circuits before is_admin() is
-- ever called. Verified both branches after the fix (self-read, and an admin
-- reading another user's profile / bids, which also depends on is_admin()).
drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy on public.profiles
  for select
  to authenticated
  using (
    (id = (select auth.uid()))
    or
    (is_admin((select auth.uid())) and (((select auth.jwt()) ->> 'aal') = 'aal2'))
  );
