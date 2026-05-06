CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining int;
BEGIN
  IF OLD.role = 'admin' THEN
    SELECT count(*) INTO remaining FROM public.user_roles WHERE role = 'admin' AND user_id <> OLD.user_id;
    IF remaining < 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin ON public.user_roles;
CREATE TRIGGER trg_prevent_last_admin
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();