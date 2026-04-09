-- Add fields required for Sharp API CreateBiz mapping
-- crop_year: agricultural year (e.g. 2025, 2026)
-- quantity_tolerance: acceptable variance % (e.g. 5, 10)
-- currency: explicit currency selected by farmer (EUR, USD, RON)
-- remarks: free-text notes from farmer

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS crop_year integer,
  ADD COLUMN IF NOT EXISTS quantity_tolerance numeric,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS remarks text;
