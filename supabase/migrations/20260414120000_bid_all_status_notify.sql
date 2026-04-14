-- Extend bid push notifications to cover all status transitions:
--   countered → shows counter_price offered by admin
--   accepted  → shows final_price (fallback: counter_price → price)
--   rejected  → shows the farmer's original price

CREATE OR REPLACE FUNCTION public.trg_bid_countered_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _headers jsonb;
  _body    jsonb;
  _title   text;
  _msg     text;
  _price   text;
  _curr    text;
BEGIN
  -- Only fire when status actually changes to a handled state
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('countered', 'accepted', 'rejected') THEN
    RETURN NEW;
  END IF;

  _curr := COALESCE(NEW.currency, 'RON');

  IF NEW.status = 'countered' THEN
    _price := COALESCE(NEW.counter_price, NEW.price)::text || ' ' || _curr || '/t';
    _title := 'Contraofertă ' || NEW.product;
    _msg   := 'Ameropa îți oferă ' || _price || ' pentru ' || NEW.quantity::text || ' t. Verifică detaliile.';

  ELSIF NEW.status = 'accepted' THEN
    _price := COALESCE(NEW.final_price, NEW.counter_price, NEW.price)::text || ' ' || _curr || '/t';
    _title := 'Ofertă acceptată ' || NEW.product;
    _msg   := 'Oferta ta a fost acceptată la ' || _price || ' pentru ' || NEW.quantity::text || ' t.';

  ELSIF NEW.status = 'rejected' THEN
    _price := NEW.price::text || ' ' || _curr || '/t';
    _title := 'Ofertă respinsă ' || NEW.product;
    _msg   := 'Oferta ta de ' || _price || ' pentru ' || NEW.quantity::text || ' t a fost respinsă.';

  END IF;

  _headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaHdrcm5kZndqcnZxZGNrZXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTQ4NDIsImV4cCI6MjA4MDc5MDg0Mn0.iiX5-Q7yshTiSwC4zwkjdu-5yse3GhFEw8WOSVvRdF0'
  );

  _body := jsonb_build_object(
    'user_ids', jsonb_build_array(NEW.farmer_id),
    'title',    _title,
    'body',     _msg,
    'data',     jsonb_build_object('screen', 'bid', 'bid_id', NEW.id::text)
  );

  PERFORM net.http_post(
    url     => 'https://zehwkrndfwjrvqdckepu.supabase.co/functions/v1/send-push',
    body    => _body,
    headers => _headers
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_countered_notify ON public.bids;
CREATE TRIGGER trg_bid_countered_notify
  AFTER UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_bid_countered_notify();
