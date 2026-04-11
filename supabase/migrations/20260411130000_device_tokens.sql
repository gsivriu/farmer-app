-- device_tokens: stores APNs (iOS) push notification tokens per user.
-- One user may have multiple devices; unique on (user_id, token).

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  platform    text        NOT NULL DEFAULT 'ios',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_user_token_unique UNIQUE (user_id, token)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON public.device_tokens (user_id);

-- RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Applied with status-check in 20260411120000_enforce_active_farmer_rls.sql.
-- This migration only creates the table; the policy is managed there so
-- that both migrations can be applied independently on each environment.
DROP POLICY IF EXISTS user_own_token_all ON public.device_tokens;
CREATE POLICY user_own_token_all ON public.device_tokens
  FOR ALL
  USING (
    auth.uid() = user_id
    AND public.is_active_farmer(auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_farmer(auth.uid())
  );
