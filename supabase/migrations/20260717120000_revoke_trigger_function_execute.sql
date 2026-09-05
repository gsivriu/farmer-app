-- ============================================================
-- Take the trigger functions off the public REST surface.
--
-- The database linter flags these as SECURITY DEFINER functions callable by
-- anon and authenticated through /rest/v1/rpc/<name>:
--   handle_new_user, log_audit_event, trg_bid_countered_notify,
--   trg_commodity_active_notify, trg_commodity_price_notify
-- (0028_anon_security_definer_function_executable,
--  0029_authenticated_security_definer_function_executable)
--
-- They are trigger functions and Postgres refuses a direct call ("trigger
-- functions can only be called as triggers"), so the exposure is narrow. But
-- they run as the definer, they are on the API surface for no reason, and
-- log_audit_event exists precisely to be tamper-evident.
--
-- EXECUTE is granted to PUBLIC by default AND explicitly to anon and
-- authenticated here, so revoking from PUBLIC alone leaves the explicit
-- grants in place — all three have to come off.
--
-- Revoking does not stop the triggers: Postgres checks EXECUTE on the trigger
-- function at CREATE TRIGGER time, not when the trigger fires. Verified on DEV
-- as an authenticated user with no EXECUTE on log_audit_event: an INSERT still
-- wrote bid.created, and an UPDATE to 'countered' still fired both
-- log_audit_event and trg_bid_countered_notify.
--
-- The same treatment applies to the SECURITY INVOKER trigger functions, which
-- the linter does not flag but which have no business being callable either.
--
-- generate_contract_no(text) is the sharper problem, and the linter misses it
-- because it is SECURITY INVOKER rather than DEFINER. It was callable by anon
-- over the REST API and burns a contract_seq value per call — confirmed on DEV,
-- where three unauthenticated POSTs consumed AMRP-00013/14/15. nextval is not
-- transactional, so the numbers do not come back: a loop leaves permanent gaps
-- in real contract numbering.
--
-- It cannot just be revoked. assign_contract_no_on_accept is SECURITY INVOKER
-- and calls it as the admin, so dropping the admin's grant would break contract
-- numbering on accept. Making that trigger SECURITY DEFINER first lets the call
-- happen as the owner. That grants callers nothing new — accepting a bid is
-- already gated by RLS to admins at aal2, and the trigger only computes
-- contract_no/accepted_at; it reads and writes nothing RLS-sensitive.
-- ============================================================

-- SECURITY DEFINER trigger functions (linter findings)
REVOKE EXECUTE ON FUNCTION public.log_audit_event()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_bid_countered_notify()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_commodity_price_notify()  FROM PUBLIC, anon, authenticated;

-- Present on PROD only; DEV never received these migrations.
DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.trg_commodity_active_notify()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.trg_commodity_active_notify() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

-- SECURITY INVOKER trigger functions — same reasoning, not linter-flagged.
REVOKE EXECUTE ON FUNCTION public.assign_contract_no_on_accept()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_bid_rate_limit()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_commodity_track_last_price() FROM PUBLIC, anon, authenticated;

-- Close the contract-number faucet: run the trigger as owner so the sequence
-- can be advanced without every admin holding a direct grant on the function.
ALTER FUNCTION public.assign_contract_no_on_accept() SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.generate_contract_no(text) FROM PUBLIC, anon, authenticated;
