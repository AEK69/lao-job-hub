
-- 1. Lock down audit_logs: only triggers (SECURITY DEFINER) may insert
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;

-- 2. Profiles: remove public read, restrict to authenticated
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 3. Profiles: block self-update of sensitive columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.coin_balance IS DISTINCT FROM OLD.coin_balance
     OR NEW.kyc_status   IS DISTINCT FROM OLD.kyc_status
     OR NEW.id_card_url  IS DISTINCT FROM OLD.id_card_url THEN
    RAISE EXCEPTION 'Cannot modify protected profile fields (coin_balance, kyc_status, id_card_url) directly';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 4. Jobs: remove anonymous public SELECT (auth required)
DROP POLICY IF EXISTS "Jobs viewable by anyone" ON public.jobs;
REVOKE SELECT ON public.jobs FROM anon;

-- 5. Notifications: only allow inserting as yourself OR by admin
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users insert notifications as themselves"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 6. Payments: only admins/cashiers or job participants can read
DROP POLICY IF EXISTS "Payments viewable by authenticated" ON public.payments;
CREATE POLICY "Payments viewable by participants and admins"
ON public.payments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'cashier')
  OR EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = payments.job_id
      AND (j.user_id = auth.uid() OR j.accepted_by = auth.uid())
  )
);

-- 7. Storage: restrict broad LIST on public buckets; allow direct URL fetches via service/public CDN
-- Tighten SELECT policies so anon cannot enumerate file lists.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Job images publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Job images are publicly accessible" ON storage.objects;
CREATE POLICY "Job images readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-images');

DROP POLICY IF EXISTS "Chat images publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Chat images are publicly accessible" ON storage.objects;
CREATE POLICY "Chat images readable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-images');

-- 8. Revoke EXECUTE on sensitive SECURITY DEFINER RPCs from anon
REVOKE EXECUTE ON FUNCTION public.admin_topup_coins(uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_kyc(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transfer_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transfer_coins(uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spend_coins(integer, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_job_escrow(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_job_completion(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancel_accepted_job(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.admin_topup_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_kyc(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_coins(integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_job_escrow(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_job_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_accepted_job(uuid) TO authenticated;
