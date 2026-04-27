-- Fix infinite recursion in user_roles policies by using SECURITY DEFINER function
-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Recreate using has_role function (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
