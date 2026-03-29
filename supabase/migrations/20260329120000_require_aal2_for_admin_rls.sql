-- ============================================================
-- Require AAL2 (MFA-verified session) for all admin operations
-- MFA must protect real data access, not just the UI layer.
-- Farmers are unaffected — their policies have no AAL check.
-- ============================================================

-- bids: admin select + update
DROP POLICY IF EXISTS admin_select_all_bids ON public.bids;
DROP POLICY IF EXISTS admin_update_all_bids ON public.bids;

CREATE POLICY admin_select_all_bids ON public.bids
    FOR SELECT USING (
        public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2'
    );

CREATE POLICY admin_update_all_bids ON public.bids
    FOR UPDATE
    USING (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2')
    WITH CHECK (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2');

-- commodities: admin write (read stays open to all authenticated)
DROP POLICY IF EXISTS admin_write_commodities ON public.commodities;

CREATE POLICY admin_write_commodities ON public.commodities
    FOR ALL
    USING (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2')
    WITH CHECK (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2');

-- profiles: admin read all + update
-- Note: users_can_read_own_profile stays unrestricted so admins can
-- still load their own profile at AAL1 to determine role.
DROP POLICY IF EXISTS admin_read_all_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_update_profiles ON public.profiles;

CREATE POLICY admin_read_all_profiles ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2');

CREATE POLICY admin_update_profiles ON public.profiles
    FOR UPDATE
    USING (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2')
    WITH CHECK (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2');

-- silo_price_configs: admin write (read stays open to all authenticated)
DROP POLICY IF EXISTS admin_write_silo_prices ON public.silo_price_configs;

CREATE POLICY admin_write_silo_prices ON public.silo_price_configs
    FOR ALL
    USING (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2')
    WITH CHECK (public.is_admin(auth.uid()) AND (auth.jwt() ->> 'aal') = 'aal2');
