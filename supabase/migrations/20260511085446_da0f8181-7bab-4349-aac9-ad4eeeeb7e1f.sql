
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS escrow_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS worker_confirmed boolean NOT NULL DEFAULT false;

-- Accept a job: move salary from employer's balance into escrow on the job
CREATE OR REPLACE FUNCTION public.accept_job_escrow(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _job public.jobs%ROWTYPE;
  _amount integer;
  _employer_balance integer;
BEGIN
  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;
  IF _job.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not available');
  END IF;
  IF _job.user_id = _caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot accept own job');
  END IF;

  _amount := COALESCE(NULLIF(regexp_replace(COALESCE(_job.salary, '0'), '[^0-9]', '', 'g'), '')::integer, 0);

  IF _amount > 0 THEN
    SELECT coin_balance INTO _employer_balance FROM public.profiles WHERE user_id = _job.user_id;
    IF _employer_balance IS NULL OR _employer_balance < _amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Employer has insufficient balance');
    END IF;
    UPDATE public.profiles SET coin_balance = coin_balance - _amount WHERE user_id = _job.user_id;
    INSERT INTO public.coin_transactions (from_user_id, to_user_id, amount, description, type)
    VALUES (_job.user_id, _job.user_id, _amount, 'Escrow hold: ' || COALESCE(_job.title, ''), 'escrow_hold');
  END IF;

  UPDATE public.jobs
     SET status = 'accepted',
         accepted_by = _caller,
         accepted_at = now(),
         escrow_amount = _amount,
         employer_confirmed = false,
         worker_confirmed = false
   WHERE id = _job_id;

  INSERT INTO public.notifications (user_id, type, title, body, job_id, sender_id)
  VALUES (_job.user_id, 'job_accepted', 'ມີຄົນຮັບງານຂອງທ່ານ!',
          'ເງິນ ' || _amount::text || '₭ ຖືກພັກໄວ້ໃນລະບົບ', _job_id, _caller);

  RETURN jsonb_build_object('success', true, 'escrow', _amount);
END;
$$;

-- Confirm completion (caller is either employer or worker). When both confirm, pay out.
CREATE OR REPLACE FUNCTION public.confirm_job_completion(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _job public.jobs%ROWTYPE;
  _both boolean;
BEGIN
  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;
  IF _job.status <> 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not in progress');
  END IF;

  IF _caller = _job.user_id THEN
    UPDATE public.jobs SET employer_confirmed = true WHERE id = _job_id;
    _job.employer_confirmed := true;
  ELSIF _caller = _job.accepted_by THEN
    UPDATE public.jobs SET worker_confirmed = true WHERE id = _job_id;
    _job.worker_confirmed := true;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  _both := _job.employer_confirmed AND _job.worker_confirmed;

  IF _both THEN
    IF _job.escrow_amount > 0 AND _job.accepted_by IS NOT NULL THEN
      UPDATE public.profiles SET coin_balance = coin_balance + _job.escrow_amount
       WHERE user_id = _job.accepted_by;
      INSERT INTO public.coin_transactions (from_user_id, to_user_id, amount, description, type)
      VALUES (_job.user_id, _job.accepted_by, _job.escrow_amount,
              'Job payout: ' || COALESCE(_job.title, ''), 'job_payment');
    END IF;
    UPDATE public.jobs
       SET status = 'completed', escrow_amount = 0
     WHERE id = _job_id;

    INSERT INTO public.notifications (user_id, type, title, body, job_id, sender_id)
    VALUES (_job.accepted_by, 'job_completed', 'ງານສຳເລັດ! ໄດ້ຮັບຫຼຽນ',
            _job.escrow_amount::text || '₭ - ' || COALESCE(_job.title, ''), _job_id, _caller),
           (_job.user_id, 'job_completed', 'ງານສຳເລັດແລ້ວ ✅',
            COALESCE(_job.title, ''), _job_id, _caller);

    RETURN jsonb_build_object('success', true, 'completed', true, 'paid', _job.escrow_amount);
  END IF;

  -- Notify the other party that one side confirmed
  INSERT INTO public.notifications (user_id, type, title, body, job_id, sender_id)
  VALUES (
    CASE WHEN _caller = _job.user_id THEN _job.accepted_by ELSE _job.user_id END,
    'confirmation_pending',
    'ອີກຝ່າຍຍືນຢັນແລ້ວ',
    'ກະລຸນາກົດຍືນຢັນຈົບງານ: ' || COALESCE(_job.title, ''),
    _job_id, _caller
  );

  RETURN jsonb_build_object('success', true, 'completed', false);
END;
$$;

-- Cancel an accepted job: refund employer, reopen job
CREATE OR REPLACE FUNCTION public.cancel_accepted_job(_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _job public.jobs%ROWTYPE;
BEGIN
  IF _caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not found');
  END IF;
  IF _job.status <> 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Job not in progress');
  END IF;
  IF _caller <> _job.user_id AND _caller <> _job.accepted_by AND NOT public.has_role(_caller, 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF _job.escrow_amount > 0 THEN
    UPDATE public.profiles SET coin_balance = coin_balance + _job.escrow_amount
     WHERE user_id = _job.user_id;
    INSERT INTO public.coin_transactions (from_user_id, to_user_id, amount, description, type)
    VALUES (_job.user_id, _job.user_id, _job.escrow_amount,
            'Escrow refund: ' || COALESCE(_job.title, ''), 'escrow_refund');
  END IF;

  UPDATE public.jobs
     SET status = 'active',
         accepted_by = NULL,
         accepted_at = NULL,
         escrow_amount = 0,
         employer_confirmed = false,
         worker_confirmed = false
   WHERE id = _job_id;

  INSERT INTO public.notifications (user_id, type, title, body, job_id, sender_id)
  VALUES (
    CASE WHEN _caller = _job.user_id THEN _job.accepted_by ELSE _job.user_id END,
    'job_cancelled',
    'ງານຖືກຍົກເລີກ',
    COALESCE(_job.title, '') || ' - ເງິນຖືກຄືນແລ້ວ',
    _job_id, _caller
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
