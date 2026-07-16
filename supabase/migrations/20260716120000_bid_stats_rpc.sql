-- ============================================================
-- bid_stats(): server-side aggregation for the Statistics panel
--
-- Replaces downloading every bid to the browser and reducing in JS.
-- Returns one row per product instead of the whole table, so the
-- payload is constant regardless of how many contracts exist.
--
-- SECURITY INVOKER is load-bearing: the existing RLS on bids does the
-- isolation, so one function serves both roles — a farmer gets only
-- their own contracts, an admin (aal2) gets all of them.
--
-- Only status = 'accepted' counts. Pending, countered and rejected bids
-- are proposals; blending their asking prices into the average yields a
-- figure matching no real transaction.
--
-- The price expression mirrors getAcceptedPrice() in
-- src/utils/bidPricing.js: final_price ?? counter_price (if > 0) ?? price.
-- greatest(NULL, 0) = 0 in Postgres, so nullif(greatest(counter_price,0),0)
-- collapses NULL, zero and negative counter-offers to NULL alike, falling
-- through to price — matching the JS hasPositiveNumber() guard.
--
-- Date filters are split by role: admins filter on the delivery window,
-- farmers on submission date.
-- ============================================================

CREATE OR REPLACE FUNCTION public.bid_stats(
    p_farmer_id         uuid DEFAULT NULL,
    p_product           text DEFAULT NULL,
    p_parity            text DEFAULT NULL,
    p_delivery_location text DEFAULT NULL,
    p_loading_location  text DEFAULT NULL,
    p_delivery_from     date DEFAULT NULL,
    p_delivery_to       date DEFAULT NULL,
    p_created_from      date DEFAULT NULL,
    p_created_to        date DEFAULT NULL,
    p_crop_year         integer DEFAULT NULL
)
RETURNS TABLE (product text, total_qty numeric, avg_price numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT b.product,
           sum(b.quantity) AS total_qty,
           sum(b.quantity * coalesce(b.final_price,
                                     nullif(greatest(b.counter_price, 0), 0),
                                     b.price))
             / nullif(sum(b.quantity), 0) AS avg_price
    FROM public.bids b
    WHERE b.status = 'accepted'
      AND (p_farmer_id         IS NULL OR b.farmer_id         = p_farmer_id)
      AND (p_product           IS NULL OR b.product           = p_product)
      AND (p_parity            IS NULL OR b.parity            = p_parity)
      AND (p_delivery_location IS NULL OR b.delivery_location = p_delivery_location)
      AND (p_loading_location  IS NULL OR b.loading_location  = p_loading_location)
      AND (p_delivery_from     IS NULL OR b.delivery_start   >= p_delivery_from)
      AND (p_delivery_to       IS NULL OR b.delivery_end     <= p_delivery_to)
      AND (p_created_from      IS NULL OR b.created_at::date >= p_created_from)
      AND (p_created_to        IS NULL OR b.created_at::date <= p_created_to)
      AND (p_crop_year         IS NULL OR b.crop_year         = p_crop_year)
    GROUP BY b.product;
$$;

-- RLS already yields anon an empty set, but leaving the function on the public
-- API surface is the same finding the linter raises elsewhere in this schema.
-- EXECUTE is granted to PUBLIC by default and anon inherits it, so revoking
-- from anon alone is a no-op — the grant has to come off PUBLIC.
REVOKE EXECUTE ON FUNCTION public.bid_stats(
    uuid, text, text, text, text, date, date, date, date, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.bid_stats(
    uuid, text, text, text, text, date, date, date, date, integer
) TO authenticated;

-- Serves the admin aggregate (no farmer_id predicate): an index-only scan
-- over accepted rows, grouped by product. Farmers are already covered by
-- idx_bids_farmer_created.
CREATE INDEX IF NOT EXISTS idx_bids_accepted_agg
    ON public.bids (product)
    INCLUDE (quantity, final_price, counter_price, price)
    WHERE status = 'accepted';
