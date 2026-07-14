
-- ============ JOBS: restrict full-row SELECT + public view ============
DROP POLICY IF EXISTS "Jobs viewable by authenticated" ON public.jobs;

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

CREATE OR REPLACE VIEW public.jobs_public
WITH (security_invoker = false) AS
SELECT id, user_id, created_by, accepted_by, assigned_staff_id, title, category, district,
       salary_type, salary, worker_confirmed, employer_confirmed, escrow_amount, status,
       accepted_at, image_url, work_time, work_date, lng, lat, is_featured, is_urgent,
       poster_name, post_type, job_number, job_type, priority, scheduled_date,
       scheduled_time, description, base_price, material_cost, discount, total_price,
       deposit_amount, payment_method, payment_status, amount_paid, job_status,
       created_at, updated_at
FROM public.jobs;

GRANT SELECT ON public.jobs_public TO authenticated, anon;

-- ============ PROFILES: restrict SELECT to owner + public view ============
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, user_id, display_name, avatar_url, district, bio, kyc_status, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- ============ STAFF: restrict SELECT to admin/cashier only ============
DROP POLICY IF EXISTS "Staff viewable by authenticated" ON public.staff;

CREATE POLICY "Admins and cashiers view staff"
ON public.staff FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cashier'));

-- ============ NOTIFICATIONS: WITH CHECK that recipient exists ============
DROP POLICY IF EXISTS "Users insert notifications as themselves" ON public.notifications;

CREATE POLICY "Users insert notifications for real recipients"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = notifications.user_id)
);

-- ============ STORAGE: remove broad public listing on public buckets ============
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view job images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Chat images publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Job images publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images readable by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Chat images readable by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Job images readable by authenticated" ON storage.objects;

-- Owners can list their own files (path starts with their uid)
CREATE POLICY "Owners can list own public files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('avatars', 'job-images', 'chat-images')
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
-- Public URL/CDN access continues to work without a SELECT policy for public buckets.

-- ============ REALTIME: deny broadcast/presence by default ============
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
-- No policies granted = default deny. postgres_changes subscriptions are unaffected
-- because they rely on RLS of the underlying table, not realtime.messages.
