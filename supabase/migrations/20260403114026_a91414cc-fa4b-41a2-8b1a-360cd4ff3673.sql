
-- Allow authenticated users to accept active jobs (set accepted_by, accepted_at, status)
CREATE POLICY "Authenticated users can accept active jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  status = 'active' AND auth.uid() != user_id
)
WITH CHECK (
  accepted_by = auth.uid() AND status = 'accepted'
);

-- Allow job owners to complete accepted jobs
CREATE POLICY "Owners can complete accepted jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id AND status = 'accepted'
)
WITH CHECK (
  status = 'completed'
);
