
-- Restore column-level grants (we'll rely on RLS + views instead)
GRANT SELECT (customer_name, customer_phone, customer_address, phone) ON public.jobs TO authenticated;
GRANT SELECT (phone, date_of_birth, id_card_url, guardian_name, guardian_phone, address, full_name, coin_balance)
  ON public.profiles TO authenticated;

-- Tighten SELECT policies: only related parties see full rows
DROP POLICY IF EXISTS "Jobs viewable by authenticated" ON public.jobs;
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Related parties view jobs"
ON public.jobs FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = created_by
  OR auth.uid() = accepted_by
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'cashier')
  OR EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid() AND s.id = jobs.assigned_staff_id)
);

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Views run as owner (security_definer) so public browsing works, and only expose safe columns
ALTER VIEW public.jobs_public SET (security_invoker = off);
ALTER VIEW public.public_profiles SET (security_invoker = off);
