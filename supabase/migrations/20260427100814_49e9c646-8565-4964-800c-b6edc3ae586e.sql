
-- =========== PROFILES ===========
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  district text,
  bio text,
  coin_balance integer NOT NULL DEFAULT 0,
  kyc_status text NOT NULL DEFAULT 'pending',
  id_card_url text,
  date_of_birth date,
  is_student boolean NOT NULL DEFAULT false,
  guardian_name text,
  guardian_phone text,
  full_name text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'User'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth users
INSERT INTO public.profiles (user_id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', email, 'User') FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- =========== JOBS additional columns ===========
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS salary text,
  ADD COLUMN IF NOT EXISTS salary_type text DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'hiring',
  ADD COLUMN IF NOT EXISTS poster_name text,
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS work_date date,
  ADD COLUMN IF NOT EXISTS work_time time,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS accepted_by uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Make legacy NOT NULL columns nullable so new app inserts work
ALTER TABLE public.jobs ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN customer_phone DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN job_type DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN job_number SET DEFAULT '';

DROP POLICY IF EXISTS "Jobs viewable by anyone" ON public.jobs;
CREATE POLICY "Jobs viewable by anyone" ON public.jobs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users insert own jobs" ON public.jobs;
CREATE POLICY "Users insert own jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);
DROP POLICY IF EXISTS "Owner updates own jobs" ON public.jobs;
CREATE POLICY "Owner updates own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owner deletes own jobs" ON public.jobs;
CREATE POLICY "Owner deletes own jobs" ON public.jobs FOR DELETE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated accept jobs" ON public.jobs;
CREATE POLICY "Authenticated accept jobs" ON public.jobs FOR UPDATE
  USING (auth.uid() IS NOT NULL AND status = 'active' AND user_id != auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========== NOTIFICATIONS additional columns ===========
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_id uuid;

-- Sync legacy "read" -> is_read
UPDATE public.notifications SET is_read = COALESCE(read, false) WHERE is_read IS DISTINCT FROM read;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =========== CONVERSATIONS & MESSAGES ===========
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL,
  participant_2 uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants view conversation" ON public.conversations;
CREATE POLICY "Participants view conversation" ON public.conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
DROP POLICY IF EXISTS "Authenticated create conversation" ON public.conversations;
CREATE POLICY "Authenticated create conversation" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
DROP POLICY IF EXISTS "Participants update conversation" ON public.conversations;
CREATE POLICY "Participants update conversation" ON public.conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  image_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())));
DROP POLICY IF EXISTS "Sender can insert messages" ON public.messages;
CREATE POLICY "Sender can insert messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())));
DROP POLICY IF EXISTS "Recipient can update read" ON public.messages;
CREATE POLICY "Recipient can update read" ON public.messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =========== COIN TRANSACTIONS ===========
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid,
  to_user_id uuid NOT NULL,
  amount integer NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'transfer',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own transactions" ON public.coin_transactions;
CREATE POLICY "Users view own transactions" ON public.coin_transactions FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
DROP POLICY IF EXISTS "Admins view all transactions" ON public.coin_transactions;
CREATE POLICY "Admins view all transactions" ON public.coin_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admins insert transactions" ON public.coin_transactions;
CREATE POLICY "Admins insert transactions" ON public.coin_transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- transfer_coins function
CREATE OR REPLACE FUNCTION public.transfer_coins(_to_user_id uuid, _amount integer, _description text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _from uuid := auth.uid();
  _balance integer;
BEGIN
  IF _from IS NULL THEN RETURN false; END IF;
  SELECT coin_balance INTO _balance FROM profiles WHERE user_id = _from;
  IF _balance IS NULL OR _balance < _amount THEN RETURN false; END IF;
  UPDATE profiles SET coin_balance = coin_balance - _amount WHERE user_id = _from;
  UPDATE profiles SET coin_balance = coin_balance + _amount WHERE user_id = _to_user_id;
  INSERT INTO coin_transactions (from_user_id, to_user_id, amount, description, type)
  VALUES (_from, _to_user_id, _amount, _description, 'job_payment');
  RETURN true;
END;
$$;

-- Admin top-up (no balance check on sender)
CREATE OR REPLACE FUNCTION public.admin_topup_coins(_to_user_id uuid, _amount integer, _description text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN false;
  END IF;
  UPDATE profiles SET coin_balance = coin_balance + _amount WHERE user_id = _to_user_id;
  INSERT INTO coin_transactions (from_user_id, to_user_id, amount, description, type)
  VALUES (NULL, _to_user_id, _amount, _description, 'admin_topup');
  RETURN true;
END;
$$;

-- =========== REVIEWS ===========
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  reviewed_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);
DROP POLICY IF EXISTS "Users delete own reviews" ON public.reviews;
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- =========== STORAGE policies for existing buckets ===========
DROP POLICY IF EXISTS "Avatars publicly readable" ON storage.objects;
CREATE POLICY "Avatars publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "ID cards owner read" ON storage.objects;
CREATE POLICY "ID cards owner read" ON storage.objects FOR SELECT
  USING (bucket_id = 'id-cards' AND (auth.uid()::text = (storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')));
DROP POLICY IF EXISTS "ID cards owner upload" ON storage.objects;
CREATE POLICY "ID cards owner upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'id-cards' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Job images publicly readable" ON storage.objects;
CREATE POLICY "Job images publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'job-images');
DROP POLICY IF EXISTS "Authenticated upload job images" ON storage.objects;
CREATE POLICY "Authenticated upload job images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Chat images publicly readable" ON storage.objects;
CREATE POLICY "Chat images publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
DROP POLICY IF EXISTS "Authenticated upload chat images" ON storage.objects;
CREATE POLICY "Authenticated upload chat images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);
