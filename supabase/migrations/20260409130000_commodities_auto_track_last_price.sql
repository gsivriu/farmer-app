-- Trigger: automatically set last_price = old price whenever price changes.
-- This makes trend tracking robust regardless of what the client sends —
-- even if the client tab is stale, the DB always captures the correct previous price.

CREATE OR REPLACE FUNCTION public.trg_commodity_track_last_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    NEW.last_price := OLD.price;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS commodity_track_last_price ON public.commodities;

CREATE TRIGGER commodity_track_last_price
BEFORE UPDATE ON public.commodities
FOR EACH ROW
EXECUTE FUNCTION public.trg_commodity_track_last_price();
