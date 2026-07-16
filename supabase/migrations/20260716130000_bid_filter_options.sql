-- ============================================================
-- bid_filter_options(): distinct values for the admin filter dropdowns
--
-- These lists were built by walking every bid held in the browser. Once the
-- list is paginated only ~50 rows are loaded, so the dropdowns would silently
-- shrink to whatever happened to be on the current page. They need a source
-- independent of pagination.
--
-- Not every filter needs this:
--   - delivery_location is constrained to the silo list by BidForm, so the
--     existing silo_price_configs query already feeds that dropdown.
--   - loading_location is a free-text input, so its domain only exists in
--     the bids table itself.
--   - crop_year is likewise only knowable from the data.
--
-- SECURITY INVOKER, so RLS scopes the options to what the caller may read.
-- ============================================================

CREATE OR REPLACE FUNCTION public.bid_filter_options()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'loading_locations', coalesce((
            SELECT jsonb_agg(DISTINCT b.loading_location ORDER BY b.loading_location)
            FROM public.bids b
            WHERE b.loading_location IS NOT NULL AND b.loading_location <> ''
        ), '[]'::jsonb),
        'crop_years', coalesce((
            SELECT jsonb_agg(DISTINCT b.crop_year ORDER BY b.crop_year DESC)
            FROM public.bids b
            WHERE b.crop_year IS NOT NULL
        ), '[]'::jsonb)
    );
$$;

-- Both revokes are needed: EXECUTE reaches anon via the default PUBLIC grant
-- and via an explicit grant from Supabase's default privileges.
REVOKE EXECUTE ON FUNCTION public.bid_filter_options() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.bid_filter_options() TO authenticated;

-- Partial indexes keep the DISTINCT scans off the heap. Both columns are
-- mostly NULL (loading_location only applies to freight parities), so the
-- partial form stays small.
CREATE INDEX IF NOT EXISTS idx_bids_loading_location
    ON public.bids (loading_location)
    WHERE loading_location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bids_crop_year
    ON public.bids (crop_year)
    WHERE crop_year IS NOT NULL;
