
-- Add image_url column to messages for image sending in chat
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;

-- Create chat-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-images
CREATE POLICY "Authenticated users can upload chat images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-images');
CREATE POLICY "Anyone can view chat images" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
