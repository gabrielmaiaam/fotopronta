INSERT INTO storage.buckets (id, name, public) VALUES ('previa-rapida', 'previa-rapida', true);

CREATE POLICY "Users upload to previa-rapida" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'previa-rapida' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read previa-rapida" ON storage.objects FOR SELECT USING (bucket_id = 'previa-rapida');