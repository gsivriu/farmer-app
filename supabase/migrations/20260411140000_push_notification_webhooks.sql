-- Push notification DB triggers via pg_net + send-push Edge Function.
--
-- Trigger 1 (bids): fires AFTER UPDATE when status changes to 'countered'
--   → notifies the farmer that an admin has sent a counter-offer.
--
-- Trigger 2 (commodities): fires AFTER UPDATE when price changes
--   → notifies all active farmers of the new price.
--
-- Both use extensions.http_post (pg_net) to call the send-push Edge Function
-- asynchronously (fire-and-forget — does not block the DB transaction).

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Bid countered notification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_bid_countered_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _payload text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'countered' OR OLD.status = 'countered' THEN
    RETURN NEW;
  END IF;

  _payload := json_build_object(
    'user_ids',        json_build_array(NEW.farmer_id),
    'title',           'Ofertă nouă de la Ameropa',
    'body',            'Ai primit o contraofertă. Verifică detaliile în aplicație.',
    'idempotency_key', 'bid_countered:' || NEW.id::text,
    'data',            json_build_object('screen', 'bid', 'bid_id', NEW.id::text)
  )::text;

  PERFORM extensions.http_post(
    url     := 'https://zehwkrndfwjrvqdckepu.supabase.co/functions/v1/send-push',
    body    := _payload,
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaHdrcm5kZndqcnZxZGNrZXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTQ4NDIsImV4cCI6MjA4MDc5MDg0Mn0.iiX5-Q7yshTiSwC4zwkjdu-5yse3GhFEw8WOSVvRdF0"}'::jsonb
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_countered_notify ON public.bids;
CREATE TRIGGER trg_bid_countered_notify
  AFTER UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bid_countered_notify();

-- ---------------------------------------------------------------------------
-- Commodity price change notification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_commodity_price_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _farmer_ids  jsonb;
  _payload     text;
  _direction   text;
BEGIN
  IF NEW.price IS NOT DISTINCT FROM OLD.price THEN
    RETURN NEW;
  END IF;

  SELECT json_agg(id)
    INTO _farmer_ids
    FROM public.profiles
   WHERE role = 'farmer' AND status = 'active';

  IF _farmer_ids IS NULL THEN
    RETURN NEW;
  END IF;

  _direction := CASE WHEN NEW.price > OLD.price THEN 'crescut' ELSE 'scăzut' END;

  _payload := json_build_object(
    'user_ids',        _farmer_ids,
    'title',           'Preț actualizat: ' || NEW.name,
    'body',            NEW.name || ' a ' || _direction || ' la ' || NEW.price::text || ' RON/t',
    'idempotency_key', 'commodity_price:' || NEW.id::text || ':' || extract(epoch from now())::bigint::text,
    'data',            json_build_object('screen', 'commodities')
  )::text;

  PERFORM extensions.http_post(
    url     := 'https://zehwkrndfwjrvqdckepu.supabase.co/functions/v1/send-push',
    body    := _payload,
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaHdrcm5kZndqcnZxZGNrZXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTQ4NDIsImV4cCI6MjA4MDc5MDg0Mn0.iiX5-Q7yshTiSwC4zwkjdu-5yse3GhFEw8WOSVvRdF0"}'::jsonb
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commodity_price_notify ON public.commodities;
CREATE TRIGGER trg_commodity_price_notify
  AFTER UPDATE ON public.commodities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_commodity_price_notify();
