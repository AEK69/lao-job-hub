-- Lock down escrow RPCs to authenticated users only
REVOKE EXECUTE ON FUNCTION public.accept_job_escrow(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_job_completion(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_accepted_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_job_escrow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_job_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_accepted_job(uuid) TO authenticated;

-- Ensure realtime emits full row data so updates can be tracked
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.coin_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication (idempotent)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;