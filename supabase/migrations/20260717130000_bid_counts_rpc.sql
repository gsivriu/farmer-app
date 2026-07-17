-- ============================================================
-- bid_counts(): server-side status counts + total volume for the Oferte header
--
-- The redesigned Oferte page shows live counts per status tab (Toate /
-- Acceptate / Respinse / În așteptare) plus a total volume in the header.
-- Both were reduced in JS over every bid held in the browser — the same
-- pattern bid_stats() replaced, and it breaks identically under pagination:
-- with 50 rows loaded, the "Acceptate" tab would read 12 when the real answer
-- is 40,000.
--
-- Deliberately NOT status-filtered: the counts describe the whole scope so the
-- tabs can show what each one would contain. Every other filter applies.
-- Parameters mirror bid_stats() exactly so both can be driven from one place
-- in the client.
--
-- 'pending' groups pending + countered + farmer_countered, matching the tab.
--
-- SECURITY INVOKER — RLS scopes the counts to the caller.
-- ============================================================

CREATE OR REPLACE FUNCTION public.bid_counts(
    p_farmer_id             uuid DEFAULT NULL,
    p_product               text DEFAULT NULL,
    p_parity                text DEFAULT NULL,
    p_delivery_location     text DEFAULT NULL,
    p_loading_location      text DEFAULT NULL,
    p_delivery_from         date DEFAULT NULL,
    p_delivery_to           date DEFAULT NULL,
    p_created_from          date DEFAULT NULL,
    p_created_to            date DEFAULT NULL,
    p_crop_year             integer DEFAULT NULL,
    p_delivery_location_unset boolean DEFAULT false,
    p_loading_location_unset  boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'all',      count(*),
        'accepted', count(*) FILTER (WHERE b.status = 'accepted'),
        'rejected', count(*) FILTER (WHERE b.status = 'rejected'),
        'pending',  count(*) FILTER (WHERE b.status IN ('pending', 'countered', 'farmer_countered')),
        'total_volume', coalesce(sum(b.quantity), 0)
    )
    FROM public.bids b
    WHERE (p_farmer_id     IS NULL OR b.farmer_id       = p_farmer_id)
      AND (p_product       IS NULL OR b.product         = p_product)
      AND (p_parity        IS NULL OR b.parity          = p_parity)
      AND (p_delivery_from IS NULL OR b.delivery_start >= p_delivery_from)
      AND (p_delivery_to   IS NULL OR b.delivery_end   <= p_delivery_to)
      AND (p_created_from  IS NULL OR b.created_at::date >= p_created_from)
      AND (p_created_to    IS NULL OR b.created_at::date <= p_created_to)
      AND (p_crop_year     IS NULL OR b.crop_year       = p_crop_year)
      AND (CASE
             WHEN p_delivery_location_unset THEN b.delivery_location IS NULL
             WHEN p_delivery_location IS NOT NULL THEN b.delivery_location = p_delivery_location
             ELSE true
           END)
      AND (CASE
             WHEN p_loading_location_unset THEN b.loading_location IS NULL
             WHEN p_loading_location IS NOT NULL THEN b.loading_location = p_loading_location
             ELSE true
           END);
$$;

-- Both revokes needed: EXECUTE reaches anon via the default PUBLIC grant and
-- via an explicit grant from Supabase's default privileges.
REVOKE EXECUTE ON FUNCTION public.bid_counts(
    uuid, text, text, text, text, date, date, date, date, integer, boolean, boolean
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.bid_counts(
    uuid, text, text, text, text, date, date, date, date, integer, boolean, boolean
) TO authenticated;

-- The default period filter is "last 30 days", so the unfiltered admin count
-- is a created_at range scan over the whole table.
CREATE INDEX IF NOT EXISTS idx_bids_created_at
    ON public.bids (created_at DESC);
