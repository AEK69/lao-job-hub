
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  district TEXT,
  bio TEXT,
  coin_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, NEW.phone, ''),
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ USER ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============ JOBS ============
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  district TEXT NOT NULL,
  salary TEXT NOT NULL,
  salary_type TEXT NOT NULL CHECK (salary_type IN ('day', 'month')),
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('hiring', 'seeking')),
  poster_name TEXT NOT NULL,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs viewable by everyone" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Users can insert own jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.jobs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all jobs" ON public.jobs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_jobs_district ON public.jobs(district);
CREATE INDEX idx_jobs_category ON public.jobs(category);
CREATE INDEX idx_jobs_post_type ON public.jobs(post_type);
CREATE INDEX idx_jobs_status ON public.jobs(status);

-- ============ COIN TRANSACTIONS ============
CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'spend_post', 'spend_featured', 'spend_urgent', 'spend_job_payment', 'refund')),
  description TEXT,
  admin_id UUID REFERENCES auth.users(id),
  job_id UUID REFERENCES public.jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.coin_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.coin_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert transactions" ON public.coin_transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function for admin to top up coins
CREATE OR REPLACE FUNCTION public.admin_topup_coins(_target_user_id UUID, _amount INTEGER, _description TEXT DEFAULT 'Admin top-up')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  INSERT INTO public.coin_transactions (user_id, amount, type, description, admin_id)
  VALUES (_target_user_id, _amount, 'topup', _description, auth.uid());
  
  UPDATE public.profiles SET coin_balance = coin_balance + _amount WHERE user_id = _target_user_id;
END;
$$;

-- Function for users to spend coins
CREATE OR REPLACE FUNCTION public.spend_coins(_amount INTEGER, _type TEXT, _job_id UUID DEFAULT NULL, _description TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _balance INTEGER;
BEGIN
  SELECT coin_balance INTO _balance FROM public.profiles WHERE user_id = auth.uid() FOR UPDATE;
  
  IF _balance IS NULL OR _balance < _amount THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.coin_transactions (user_id, amount, type, description, job_id)
  VALUES (auth.uid(), -_amount, _type, _description, _job_id);
  
  UPDATE public.profiles SET coin_balance = coin_balance - _amount WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$;

-- ============ MESSAGES / CHAT ============
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, participant_1, participant_2)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT 
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations" ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in own conversations" ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can mark messages as read" ON public.messages FOR UPDATE 
  USING (
    sender_id != auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_conversations_participants ON public.conversations(participant_1, participant_2);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
