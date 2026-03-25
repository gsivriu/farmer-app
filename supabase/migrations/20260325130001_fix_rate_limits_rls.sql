-- ============================================================
-- Fix rate_limits RLS advisory: rls_enabled_no_policy
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
--
-- Context: public.rate_limits is used exclusively by Edge Functions via
-- service_role key. service_role bypasses RLS entirely, so no permissive
-- policy is needed for legitimate access.
--
-- With RLS enabled and no policies, all authenticated/anon access is already
-- denied. This migration adds an explicit restrictive policy to:
--   1. Silence the advisory (which fires when zero policies exist)
--   2. Make the access intent self-documenting in the schema
-- ============================================================

CREATE POLICY rate_limits_deny_direct_access ON public.rate_limits
    AS RESTRICTIVE
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);

COMMENT ON TABLE public.rate_limits IS
  'Rate limiting state for Edge Functions. Accessed exclusively via service_role — direct access by authenticated/anon roles is intentionally denied.';
