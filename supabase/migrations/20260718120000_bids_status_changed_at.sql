-- ============================================================
-- bids.status_changed_at: when the bid last moved between statuses
--
-- The Oferte cards showed created_at, so a bid accepted or countered weeks
-- after submission still displayed its original date — no way to tell when it
-- last changed hands. This column tracks the moment status last changed
-- (pending → countered → accepted/rejected …), set by a BEFORE trigger.
--
-- Deliberately status-specific, not a generic updated_at: editing freight or a
-- delivery location without changing status must NOT bump this, or the date
-- would stop meaning "last status change".
-- ============================================================

ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

-- Backfill the best timestamp available for each existing row's current status.
-- accepted_at is the real accept time where set; otherwise created_at is the
-- only anchor we have.
UPDATE public.bids
SET status_changed_at = COALESCE(accepted_at, created_at)
WHERE status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION public.trg_bids_status_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_changed_at := COALESCE(NEW.status_changed_at, now());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bids_status_changed_at ON public.bids;
CREATE TRIGGER bids_status_changed_at
  BEFORE INSERT OR UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.trg_bids_status_changed_at();

-- Keep the trigger function off the public REST surface, matching every other
-- trigger function in this schema (0028/0029 linter findings).
REVOKE EXECUTE ON FUNCTION public.trg_bids_status_changed_at() FROM PUBLIC, anon, authenticated;
