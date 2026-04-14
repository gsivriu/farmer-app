-- ============================================================
-- Audit Log: table + trigger function + triggers + RLS
-- ============================================================

-- Table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id          bigserial PRIMARY KEY,
  user_id     uuid,
  action      text NOT NULL,
  table_name  text,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX audit_log_user_id_idx    ON public.audit_log (user_id);
CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX audit_log_action_idx     ON public.audit_log (action);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY audit_log_admin_read ON public.audit_log
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Nobody can write directly — only SECURITY DEFINER trigger function can insert
CREATE POLICY audit_log_deny_write ON public.audit_log
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- Trigger function (SECURITY DEFINER bypasses RLS for insert)
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_action    text;
  v_record_id text;
  v_old_data  jsonb;
  v_new_data  jsonb;
BEGIN
  -- Record ID
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::text;
  ELSE
    v_record_id := NEW.id::text;
  END IF;

  -- Action name
  IF TG_TABLE_NAME = 'bids' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'bid.created';
    ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      v_action := 'bid.' || NEW.status;  -- bid.accepted / bid.rejected / bid.cancelled
    ELSE
      v_action := 'bid.updated';
    END IF;

  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'farmer.invited';
    ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      v_action := CASE NEW.status WHEN 'active' THEN 'farmer.enabled' ELSE 'farmer.disabled' END;
    ELSE
      v_action := 'farmer.updated';
    END IF;

  ELSIF TG_TABLE_NAME = 'commodities' THEN
    v_action := 'commodity.' || lower(TG_OP);

  ELSIF TG_TABLE_NAME = 'silo_price_configs' THEN
    v_action := 'silo_config.' || lower(TG_OP);

  ELSE
    v_action := TG_TABLE_NAME || '.' || lower(TG_OP);
  END IF;

  -- Old / new data
  IF TG_OP = 'INSERT' THEN
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), v_action, TG_TABLE_NAME, v_record_id, v_old_data, v_new_data);

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER audit_bids
  AFTER INSERT OR UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_commodities
  AFTER INSERT OR UPDATE OR DELETE ON public.commodities
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_silo_price_configs
  AFTER INSERT OR UPDATE OR DELETE ON public.silo_price_configs
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
