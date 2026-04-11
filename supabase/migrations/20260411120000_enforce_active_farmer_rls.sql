-- P4 fix: enforce status='active' in all farmer RLS policies.
--
-- Root cause (confirmed by Codex review):
-- Policies on bids, farmer_rewards, and device_tokens checked only
-- auth.uid(), not live DB state. A correctly-signed but unexpired JWT
-- from a disabled farmer could read/write bids and rewards until token
-- expiry — disabling the account in profiles had no immediate effect.
--
-- Fix: is_active_farmer() queries profiles on every request (STABLE,
-- not IMMUTABLE) so disabling a user takes effect at the next query,
-- not at token expiry. Pattern mirrors the existing is_admin() helper.
--
-- Intentionally NOT applied to:
--   users_can_read_own_profile  — disabled farmers need profile access
--                                 to understand why they are locked out
--   authenticated_read_commodities / authenticated_read_silo_prices
--                                 — quasi-public data, no write risk

CREATE OR REPLACE FUNCTION public.is_active_farmer(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid
      AND p.role = 'farmer'
      AND p.status = 'active'
  );
$$;

-- bids
DROP POLICY IF EXISTS farmer_insert_own_bids ON public.bids;
CREATE POLICY farmer_insert_own_bids ON public.bids
  FOR INSERT WITH CHECK (
    auth.uid() = farmer_id
    AND public.is_active_farmer(auth.uid())
  );

DROP POLICY IF EXISTS farmer_select_own_bids ON public.bids;
CREATE POLICY farmer_select_own_bids ON public.bids
  FOR SELECT USING (
    auth.uid() = farmer_id
    AND public.is_active_farmer(auth.uid())
  );

DROP POLICY IF EXISTS farmer_update_own_bids ON public.bids;
CREATE POLICY farmer_update_own_bids ON public.bids
  FOR UPDATE
  USING (
    auth.uid() = farmer_id
    AND status = 'countered'
    AND public.is_active_farmer(auth.uid())
  )
  WITH CHECK (
    auth.uid() = farmer_id
    AND status = ANY (ARRAY['farmer_countered'::text, 'accepted'::text, 'rejected'::text])
    AND public.is_active_farmer(auth.uid())
  );

-- farmer_rewards
DROP POLICY IF EXISTS farmer_rewards_select_own ON public.farmer_rewards;
CREATE POLICY farmer_rewards_select_own ON public.farmer_rewards
  FOR SELECT USING (
    farmer_id = auth.uid()
    AND public.is_active_farmer(auth.uid())
  );

-- device_tokens (created in 20260409120000 / applied directly to DEV later)
DROP POLICY IF EXISTS user_own_token_all ON public.device_tokens;
CREATE POLICY user_own_token_all ON public.device_tokens
  FOR ALL
  USING (
    auth.uid() = user_id
    AND public.is_active_farmer(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_farmer(auth.uid())
  );
