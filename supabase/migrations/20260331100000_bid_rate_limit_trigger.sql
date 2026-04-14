-- ============================================================
-- Bid rate limiting: 5 bids/minute AND 15 bids/hour per farmer
-- Captures trigger + function that were applied directly to DB.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_bid_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  count_per_minute INTEGER;
  count_per_hour   INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_per_minute
  FROM public.bids
  WHERE farmer_id = NEW.farmer_id
    AND created_at > NOW() - INTERVAL '1 minute';

  IF count_per_minute >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many bids submitted';
  END IF;

  SELECT COUNT(*) INTO count_per_hour
  FROM public.bids
  WHERE farmer_id = NEW.farmer_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF count_per_hour >= 15 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many bids submitted';
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS bid_rate_limit_trigger ON public.bids;
CREATE TRIGGER bid_rate_limit_trigger
  BEFORE INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.check_bid_rate_limit();
