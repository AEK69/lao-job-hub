
-- Add KYC fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_url TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_name TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS guardian_phone TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

-- Add image_url to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('id-cards', 'id-cards', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('job-images', 'job-images', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for id-cards (only user and admin can see)
CREATE POLICY "Users can upload own id card" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'id-cards' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own id card" ON storage.objects FOR SELECT USING (bucket_id = 'id-cards' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Admins can view all id cards" ON storage.objects FOR SELECT USING (bucket_id = 'id-cards' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for job-images
CREATE POLICY "Anyone can view job images" ON storage.objects FOR SELECT USING (bucket_id = 'job-images');
CREATE POLICY "Users can upload job images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'job-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own job images" ON storage.objects FOR UPDATE USING (bucket_id = 'job-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own job images" ON storage.objects FOR DELETE USING (bucket_id = 'job-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admin function to approve/reject KYC
CREATE OR REPLACE FUNCTION public.admin_update_kyc(_target_user_id UUID, _status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.profiles SET kyc_status = _status WHERE user_id = _target_user_id;
END;
$$;
