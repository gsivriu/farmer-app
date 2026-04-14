-- Fix trg_commodity_price_notify: infer currency from commodity name
-- Floarea soarelui → USD, all others → EUR

CREATE OR REPLACE FUNCTION public.trg_commodity_price_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _farmer_ids jsonb;
  _headers    jsonb;
  _body       jsonb;
  _direction  text;
  _diff       numeric;
  _sign       text;
  _curr       text;
BEGIN
  IF NEW.price IS NOT DISTINCT FROM OLD.price THEN
    RETURN NEW;
  END IF;

  SELECT jsonb_agg(id)
    INTO _farmer_ids
    FROM public.profiles
   WHERE role = 'farmer' AND status = 'active';

  IF _farmer_ids IS NULL THEN
    RETURN NEW;
  END IF;

  _diff      := NEW.price - OLD.price;
  _direction := CASE WHEN _diff > 0 THEN '▲' ELSE '▼' END;
  _sign      := CASE WHEN _diff > 0 THEN '+' ELSE '' END;
  _curr      := CASE WHEN NEW.name ILIKE '%floarea soarelui%' THEN 'USD' ELSE 'EUR' END;

  _headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaHdrcm5kZndqcnZxZGNrZXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTQ4NDIsImV4cCI6MjA4MDc5MDg0Mn0.iiX5-Q7yshTiSwC4zwkjdu-5yse3GhFEw8WOSVvRdF0'
  );

  _body := jsonb_build_object(
    'user_ids', _farmer_ids,
    'title',    _direction || ' ' || NEW.name || ': ' || NEW.price::text || ' ' || _curr || '/t',
    'body',     'Preț nou: ' || NEW.price::text || ' ' || _curr || '/t (' || _sign || _diff::text || ' față de ' || OLD.price::text || ')',
    'data',     jsonb_build_object('screen', 'commodities')
  );

  PERFORM net.http_post(
    url     => 'https://zehwkrndfwjrvqdckepu.supabase.co/functions/v1/send-push',
    body    => _body,
    headers => _headers
  );

  RETURN NEW;
END;
$$;
