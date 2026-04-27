DROP FUNCTION IF EXISTS public.admin_topup_coins(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.admin_topup_coins(_to_user_id uuid, _amount integer, _description text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _balance integer;
  _new_balance integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
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
  VALUES (NULL, _to_user_id, _to_user_id, auth.uid(), _amount, _description,
          CASE WHEN _amount >= 0 THEN 'admin_topup' ELSE 'admin_deduct' END);
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    _to_user_id,
    CASE WHEN _amount >= 0 THEN 'coins_received' ELSE 'coins_deducted' END,
    CASE WHEN _amount >= 0 THEN 'ໄດ້ຮັບຫຼຽນ 💰' ELSE 'ຫັກຫຼຽນ' END,
    abs(_amount)::text || '₭ - ' || COALESCE(_description, '')
  );
  RETURN jsonb_build_object('success', true, 'new_balance', _new_balance);
END;
$function$;
