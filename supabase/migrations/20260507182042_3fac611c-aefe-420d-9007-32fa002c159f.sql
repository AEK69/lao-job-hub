
-- 1) Enforce single-admin invariant
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_admin_idx
  ON public.user_roles ((role)) WHERE role = 'admin';

-- 2) Safe admin transfer (atomic swap; bypasses the "last admin" guard cleanly)
CREATE OR REPLACE FUNCTION public.transfer_admin(_to_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF NOT public.has_role(_caller, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF _to_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user required');
  END IF;
  IF _to_user_id = _caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already the admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _to_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
  END IF;

  -- Atomic swap on the single admin row
  UPDATE public.user_roles
     SET user_id = _to_user_id, created_at = now()
   WHERE role = 'admin';

  INSERT INTO public.audit_logs (action, target_table, target_id, old_value, new_value, user_id)
  VALUES ('admin_transferred', 'user_roles', _to_user_id,
          jsonb_build_object('from', _caller),
          jsonb_build_object('to',   _to_user_id),
          _caller);

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (_to_user_id, 'admin_granted',
          'ທ່ານໄດ້ຮັບສິດ Admin 🛡️',
          'ບັນຊີຂອງທ່ານຖືກກຳນົດເປັນ Admin ຂອງລະບົບ');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3) Generic audit-log trigger
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _old jsonb;
  _new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _id  := (to_jsonb(OLD)->>'id')::uuid;
    _old := to_jsonb(OLD);
    _new := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _id  := (to_jsonb(NEW)->>'id')::uuid;
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
  ELSE
    _id  := (to_jsonb(NEW)->>'id')::uuid;
    _old := NULL;
    _new := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (action, target_table, target_id, old_value, new_value, user_id)
  VALUES (lower(TG_OP), TG_TABLE_NAME, _id, _old, _new, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_jobs        ON public.jobs;
DROP TRIGGER IF EXISTS audit_profiles    ON public.profiles;
DROP TRIGGER IF EXISTS audit_reviews     ON public.reviews;
DROP TRIGGER IF EXISTS audit_user_roles  ON public.user_roles;

CREATE TRIGGER audit_jobs       AFTER INSERT OR UPDATE OR DELETE ON public.jobs       FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_profiles   AFTER INSERT OR UPDATE OR DELETE ON public.profiles   FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_reviews    AFTER INSERT OR UPDATE OR DELETE ON public.reviews    FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();
