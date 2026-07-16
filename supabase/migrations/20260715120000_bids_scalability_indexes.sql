-- ============================================================
-- Scalability: add indexes on public.bids
--
-- bids had only bids_pkey + bids_contract_no_key. Every farmer query,
-- every farmer RLS check, and the bid rate-limit trigger filter on
-- farmer_id / created_at / status — all seq-scanned the whole table.
-- At 5k–10k farmers with bid history this degrades badly.
--
-- Covers:
--   farmer_select_own_bids RLS  → WHERE farmer_id = auth.uid()
--   ActivityTab query           → .eq(farmer_id).order(created_at desc)
--   check_bid_rate_limit()      → COUNT WHERE farmer_id AND created_at > ...
--   status filters (admin/farmer list + stats)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bids_farmer_created
    ON public.bids (farmer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bids_status
    ON public.bids (status);
