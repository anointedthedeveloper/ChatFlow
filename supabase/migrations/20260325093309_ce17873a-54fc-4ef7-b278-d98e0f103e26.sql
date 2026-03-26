
-- Create chat-attachments bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- RLS for chat-attachments
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

-- RLS for avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
