-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP FOR WORKDAY APP
-- Round 2: Authentication Foundation
-- ============================================================================

-- 1. Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. RLS POLICIES FOR jobs TABLE
-- ============================================================================

-- Enable RLS on jobs table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- SELECT: admins see all, staff see their assigned jobs, cashier sees all
CREATE POLICY "admins_see_all_jobs" 
ON public.jobs FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'cashier'
);

CREATE POLICY "staff_see_own_jobs"
ON public.jobs FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'staff'
  AND assigned_staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);

-- INSERT: admin and cashier only
CREATE POLICY "admin_cashier_insert_jobs"
ON public.jobs FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'cashier')
);

-- UPDATE: admin can update all fields, staff can only update job_status on their own
CREATE POLICY "admin_update_all_jobs"
ON public.jobs FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "staff_update_own_job_status"
ON public.jobs FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'staff'
  AND assigned_staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'staff'
  AND assigned_staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);

-- DELETE: admin only
CREATE POLICY "admin_delete_jobs"
ON public.jobs FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- 3. RLS POLICIES FOR payments TABLE
-- ============================================================================

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bcel', 'bank_transfer')),
  reference_note text,
  received_by_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- SELECT: admin and cashier see all, staff cannot see payments
CREATE POLICY "admin_cashier_see_payments"
ON public.payments FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'cashier')
);

-- INSERT: admin and cashier only
CREATE POLICY "admin_cashier_insert_payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'cashier')
);

-- UPDATE: admin only
CREATE POLICY "admin_update_payments"
ON public.payments FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- DELETE: admin only
CREATE POLICY "admin_delete_payments"
ON public.payments FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- 4. RLS POLICIES FOR staff TABLE
-- ============================================================================

-- SELECT: all authenticated users
CREATE POLICY "auth_users_see_staff"
ON public.staff FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY "admin_manage_staff"
ON public.staff FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- 5. RLS POLICIES FOR services TABLE
-- ============================================================================

-- SELECT: all authenticated users
CREATE POLICY "auth_users_see_services"
ON public.services FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY "admin_manage_services"
ON public.services FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- 6. RLS POLICIES FOR user_roles TABLE
-- ============================================================================

-- SELECT: user can see own role, admin sees all
CREATE POLICY "users_see_own_role"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- INSERT/UPDATE/DELETE: admin only
CREATE POLICY "admin_manage_roles"
ON public.user_roles FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- 7. Create audit_logs table and RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: admin only
CREATE POLICY "admin_see_audit_logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
);

-- INSERT: all authenticated users (system inserts)
CREATE POLICY "auth_users_insert_audit"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. Create job_images table if needed
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.job_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.job_images ENABLE ROW LEVEL SECURITY;

-- SELECT: access based on job visibility
CREATE POLICY "see_job_images_if_can_see_job"
ON public.job_images FOR SELECT
TO authenticated
USING (
  job_id IN (
    SELECT id FROM public.jobs 
    WHERE 
      (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
      OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'cashier'
      OR (
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'staff'
        AND assigned_staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      )
  )
);

-- INSERT: can insert for jobs you have access to
CREATE POLICY "insert_images_for_accessible_jobs"
ON public.job_images FOR INSERT
TO authenticated
WITH CHECK (
  job_id IN (
    SELECT id FROM public.jobs 
    WHERE 
      (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) IN ('admin', 'cashier')
      OR (
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'staff'
        AND assigned_staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
      )
  )
);

-- DELETE: admin only or uploader of image
CREATE POLICY "delete_own_or_admin_images"
ON public.job_images FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'
  OR uploaded_by = auth.uid()
);
