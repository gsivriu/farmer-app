-- Persist previous price in DB so trend survives logout/login
-- and is calculated per-commodity independently.
ALTER TABLE public.commodities
  ADD COLUMN IF NOT EXISTS last_price numeric;
