
-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- admin_update_kyc
CREATE OR REPLACE FUNCTION public.admin_update_kyc(_target_user_id uuid, _status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE profiles SET kyc_status = _status, updated_at = now() WHERE user_id = _target_user_id;
  RETURN true;
END;
$$;

-- spend_coins (for posting urgent/featured)
CREATE OR REPLACE FUNCTION public.spend_coins(_amount integer, _type text, _description text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user uuid := auth.uid();
  _balance integer;
BEGIN
  IF _user IS NULL THEN RETURN false; END IF;
  SELECT coin_balance INTO _balance FROM profiles WHERE user_id = _user;
  IF _balance IS NULL OR _balance < _amount THEN RETURN false; END IF;
  UPDATE profiles SET coin_balance = coin_balance - _amount WHERE user_id = _user;
  INSERT INTO coin_transactions (from_user_id, to_user_id, amount, description, type)
  VALUES (_user, _user, _amount, _description, _type);
  RETURN true;
END;
$$;

-- Add updated_at to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add a user_id virtual column compat: profiles loadTransactions uses .eq('user_id', user.id)
-- Since coin_transactions doesn't have user_id, add a generated column or rename approach:
-- Easier: keep separate, ProfilePage will be patched to use from_user_id/to_user_id OR
-- We add user_id as a trigger-maintained column for backwards compat
ALTER TABLE public.coin_transactions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.coin_transactions ADD COLUMN IF NOT EXISTS admin_id uuid;
-- Backfill: user_id = to_user_id for received, from_user_id otherwise – but we'll have ProfilePage filter via .or()

-- Tighten "Authenticated accept jobs" - replace overly permissive update
DROP POLICY IF EXISTS "Authenticated accept jobs" ON public.jobs;
CREATE POLICY "Authenticated accept jobs" ON public.jobs FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status = 'active' AND user_id IS DISTINCT FROM auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND (accepted_by = auth.uid() OR status IN ('accepted','completed')));
