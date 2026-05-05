-- 1) Harden admin_topup_coins
CREATE OR REPLACE FUNCTION public.admin_topup_coins(_to_user_id uuid, _amount integer, _description text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance integer;
  _new_balance integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF _to_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user required');
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be non-zero');
  END IF;
  IF abs(_amount) > 10000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds limit (10,000,000₭)');
  END IF;
  SELECT coin_balance INTO _balance FROM profiles WHERE user_id = _to_user_id;
  IF _balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  _new_balance := _balance + _amount;
  IF _new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance', 'balance', _balance);
  END IF;
  UPDATE profiles SET coin_balance = _new_balance, updated_at = now() WHERE user_id = _to_user_id;
  INSERT INTO coin_transactions (from_user_id, to_user_id, user_id, admin_id, amount, description, type)
  VALUES (NULL, _to_user_id, _to_user_id, auth.uid(), _amount, COALESCE(NULLIF(_description, ''), 'Admin adjustment'),
          CASE WHEN _amount >= 0 THEN 'admin_topup' ELSE 'admin_deduct' END);
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    _to_user_id,
    CASE WHEN _amount >= 0 THEN 'coins_received' ELSE 'coins_deducted' END,
    CASE WHEN _amount >= 0 THEN 'ໄດ້ຮັບຫຼຽນ 💰' ELSE 'ຫັກຫຼຽນ' END,
    abs(_amount)::text || '₭ - ' || COALESCE(_description, '')
  );
  RETURN jsonb_build_object('success', true, 'new_balance', _new_balance, 'delta', _amount);
END;
$$;

-- 2) Reviews moderation
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

-- 3) Validation trigger for reviews
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _job_status text;
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF NEW.status NOT IN ('approved', 'pending', 'hidden') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;
  IF NEW.reviewer_id = NEW.reviewed_id THEN
    RAISE EXCEPTION 'Cannot review yourself';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.job_id IS NOT NULL THEN
    SELECT status INTO _job_status FROM public.jobs WHERE id = NEW.job_id;
    IF _job_status IS DISTINCT FROM 'completed' THEN
      RAISE EXCEPTION 'Job must be completed before reviewing';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_review ON public.reviews;
CREATE TRIGGER trg_validate_review
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review();

-- 4) Unique reviewer per job
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_job
ON public.reviews (reviewer_id, reviewed_id, COALESCE(job_id::text, 'null'));

-- 5) Admin can moderate reviews
DROP POLICY IF EXISTS "Admins manage reviews" ON public.reviews;
CREATE POLICY "Admins manage reviews" ON public.reviews
FOR ALL USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));