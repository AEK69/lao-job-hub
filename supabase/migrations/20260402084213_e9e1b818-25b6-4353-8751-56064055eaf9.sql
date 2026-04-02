
CREATE OR REPLACE FUNCTION public.transfer_coins(
  _to_user_id UUID,
  _amount INTEGER,
  _description TEXT DEFAULT 'Coin transfer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance INTEGER;
BEGIN
  -- Check sender balance
  SELECT coin_balance INTO _balance FROM public.profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF _balance IS NULL OR _balance < _amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct from sender
  UPDATE public.profiles SET coin_balance = coin_balance - _amount WHERE user_id = auth.uid();
  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (auth.uid(), -_amount, 'transfer_out', _description);

  -- Add to receiver
  UPDATE public.profiles SET coin_balance = coin_balance + _amount WHERE user_id = _to_user_id;
  INSERT INTO public.coin_transactions (user_id, amount, type, description)
  VALUES (_to_user_id, _amount, 'transfer_in', _description);

  RETURN TRUE;
END;
$$;
