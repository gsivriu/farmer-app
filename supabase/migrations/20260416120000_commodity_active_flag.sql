-- Add active flag to commodities
-- When active = false, the commodity price is hidden from farmers
-- and a push notification is sent to inform them

ALTER TABLE public.commodities
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Function: notify farmers when a commodity is stopped or resumed
CREATE OR REPLACE FUNCTION public.trg_commodity_active_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _farmer_ids jsonb;
  _headers    jsonb;
  _body       jsonb;
  _curr       text;
BEGIN
  -- Only fire when active status changes
  IF NEW.active IS NOT DISTINCT FROM OLD.active THEN
    RETURN NEW;
  END IF;

  -- If resuming and price also changed, let the price trigger handle the notification
  IF NEW.active = true AND NEW.price IS DISTINCT FROM OLD.price THEN
    RETURN NEW;
  END IF;

  SELECT jsonb_agg(id)
    INTO _farmer_ids
    FROM public.profiles
   WHERE role = 'farmer' AND status = 'active';

  IF _farmer_ids IS NULL THEN
    RETURN NEW;
  END IF;

  _curr := COALESCE(NULLIF(TRIM(NEW.currency), ''), 'EUR');

  IF NEW.active = false THEN
    _body := jsonb_build_object(
      'user_ids', _farmer_ids,
      'title',    'Achiziție oprită: ' || NEW.name,
      'body',     'Prețul pentru ' || NEW.name || ' nu mai este disponibil momentan.',
      'data',     jsonb_build_object('screen', 'commodities')
    );
  ELSE
    _body := jsonb_build_object(
      'user_ids', _farmer_ids,
      'title',    'Preț disponibil: ' || NEW.name || ' — ' || NEW.price::text || ' ' || _curr || '/t',
      'body',     'Prețul pentru ' || NEW.name || ' este din nou disponibil.',
      'data',     jsonb_build_object('screen', 'commodities')
    );
  END IF;

  _headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaHdrcm5kZndqcnZxZGNrZXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTQ4NDIsImV4cCI6MjA4MDc5MDg0Mn0.iiX5-Q7yshTiSwC4zwkjdu-5yse3GhFEw8WOSVvRdF0'
  );

  PERFORM net.http_post(
    url     => 'https://zehwkrndfwjrvqdckepu.supabase.co/functions/v1/send-push',
    body    => _body,
    headers => _headers
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_commodity_active_notify
  AFTER UPDATE ON public.commodities
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_commodity_active_notify();
