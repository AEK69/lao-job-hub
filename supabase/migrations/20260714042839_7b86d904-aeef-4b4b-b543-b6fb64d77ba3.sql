
-- Switch views to security_invoker so they respect caller RLS
ALTER VIEW public.jobs_public SET (security_invoker = on);
ALTER VIEW public.public_profiles SET (security_invoker = on);

-- Restore broad SELECT policies but hide sensitive columns via GRANT/REVOKE
DROP POLICY IF EXISTS "Related parties view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

CREATE POLICY "Jobs viewable by authenticated"
ON public.jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Profiles viewable by authenticated"
ON public.profiles FOR SELECT TO authenticated USING (true);

-- Column-level privileges: hide sensitive columns from general roles
REVOKE SELECT (customer_name, customer_phone, customer_address, phone) ON public.jobs FROM authenticated, anon;
REVOKE SELECT (phone, date_of_birth, id_card_url, guardian_name, guardian_phone, address, full_name, coin_balance)
  ON public.profiles FROM authenticated, anon;

-- Owners access their own sensitive data via SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_job_contact(_job_id uuid)
RETURNS TABLE (phone text, customer_name text, customer_phone text, customer_address text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _j public.jobs%ROWTYPE;
BEGIN
  SELECT * INTO _j FROM public.jobs WHERE id = _job_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF auth.uid() = _j.user_id
     OR auth.uid() = _j.created_by
     OR auth.uid() = _j.accepted_by
     OR public.has_role(auth.uid(), 'admin')
     OR public.has_role(auth.uid(), 'cashier')
     OR EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid() AND s.id = _j.assigned_staff_id)
  THEN
    RETURN QUERY SELECT _j.phone, _j.customer_name, _j.customer_phone, _j.customer_address;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.get_job_contact(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_job_contact(uuid) TO authenticated;

-- Admin/cashier need full jobs access including sensitive cols — grant back to service_role
-- Admin queries can use these RPCs to get sensitive data:
CREATE OR REPLACE FUNCTION public.admin_get_jobs()
RETURNS SETOF public.jobs
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.jobs
   WHERE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cashier')
   ORDER BY created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_get_jobs() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_jobs() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.profiles
   WHERE public.has_role(auth.uid(), 'admin')
   ORDER BY created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_get_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_profiles() TO authenticated;
