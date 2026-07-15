
-- 1) Security invoker views
ALTER VIEW public.jobs_public SET (security_invoker = true);
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- 2) Storage upload folder-ownership checks
DROP POLICY IF EXISTS "Authenticated upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload job images" ON storage.objects;

CREATE POLICY "Chat images owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Job images owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Restrict job_images SELECT to related parties or admins/cashier
DROP POLICY IF EXISTS "Job images viewable by authenticated" ON public.job_images;

CREATE POLICY "Related parties view job images" ON public.job_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_images.job_id
        AND (
          auth.uid() = j.user_id
          OR auth.uid() = j.created_by
          OR auth.uid() = j.accepted_by
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'cashier')
          OR EXISTS (
            SELECT 1 FROM public.staff s
            WHERE s.user_id = auth.uid() AND s.id = j.assigned_staff_id
          )
        )
    )
    OR uploaded_by = auth.uid()
  );

-- 4) Tighten job status-change policy so only the assigned worker can move to accepted/completed
DROP POLICY IF EXISTS "Authenticated accept jobs" ON public.jobs;

CREATE POLICY "Authenticated accept jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND status IN ('active', 'accepted')
    AND user_id IS DISTINCT FROM auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND accepted_by = auth.uid()
    AND status = ANY (ARRAY['accepted'::text, 'completed'::text])
  );
