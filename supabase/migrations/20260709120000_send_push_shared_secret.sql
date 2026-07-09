-- Harden send-push so only the DB triggers can invoke it.
--
-- Problem: send-push (verify_jwt = true) accepted any caller holding the
-- public anon key and would fan out APNs pushes to arbitrary user_ids. Any
-- authenticated user could spam/phish other users' devices.
--
-- Fix: a shared secret that lives in ONE place — private.function_secrets,
-- a schema that is NOT exposed through PostgREST, so it is unreachable from
-- the anon/authenticated API. The bid/commodity triggers read the secret and
-- pass it as the `x-webhook-secret` header; the Edge Function validates it via
-- public.verify_send_push_secret(). Because both sides read the same DB row,
-- they stay in sync automatically and no external caller can learn the value.

-- ---------------------------------------------------------------------------
-- Secret storage (private schema — not API-reachable)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.function_secrets (
  name  text PRIMARY KEY,
  value text NOT NULL
);

REVOKE ALL ON private.function_secrets FROM anon, authenticated;

-- Seed a random secret if one does not already exist. The value is never
-- needed outside the DB: the trigger reads it here, the Edge Function verifies
-- against it via the RPC below.
INSERT INTO private.function_secrets (name, value)
VALUES ('send_push', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Validator RPC — callable only by service_role (the Edge Function)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_send_push_secret(candidate text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.function_secrets
    WHERE name = 'send_push' AND value = candidate
  );
$$;

REVOKE ALL ON FUNCTION public.verify_send_push_secret(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_send_push_secret(text) TO service_role;

-- ---------------------------------------------------------------------------
-- Recreate the two notification triggers to attach the secret header.
-- Logic is identical to 20260411140000; only the headers gain x-webhook-secret.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_bid_countered_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _payload text;
  _secret  text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'countered' OR OLD.status = 'countered' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO _secret FROM private.function_secrets WHERE name = 'send_push';

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
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'apikey',          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaHdrcm5kZndqcnZxZGNrZXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTQ4NDIsImV4cCI6MjA4MDc5MDg0Mn0.iiX5-Q7yshTiSwC4zwkjdu-5yse3GhFEw8WOSVvRdF0',
      'x-webhook-secret', COALESCE(_secret, '')
    )
  );

  RETURN NEW;
END;
$$;

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
  _secret      text;
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

  SELECT value INTO _secret FROM private.function_secrets WHERE name = 'send_push';

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
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'apikey',          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplaHdrcm5kZndqcnZxZGNrZXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMTQ4NDIsImV4cCI6MjA4MDc5MDg0Mn0.iiX5-Q7yshTiSwC4zwkjdu-5yse3GhFEw8WOSVvRdF0',
      'x-webhook-secret', COALESCE(_secret, '')
    )
  );

  RETURN NEW;
END;
$$;
