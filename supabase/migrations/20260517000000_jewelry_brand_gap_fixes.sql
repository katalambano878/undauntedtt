-- ============================================================================
-- Brand-specific gap fixes (Undaunted Treasure Trove migration pass)
-- 1. Index on customers.phone (search by phone in upsert_customer_from_order)
-- 2. Storage UPDATE policy on media bucket (only had read/insert/delete)
-- 3. Read + admin-write policies for avatars / blog / reviews buckets
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers USING btree (phone);

CREATE POLICY "Admin update access for media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media' AND is_admin_or_staff() = true);

-- avatars bucket: public read; users upload/manage their own files (path prefix = user id)
CREATE POLICY "Public read access for avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admin manage all avatars" ON storage.objects
  FOR ALL USING (bucket_id = 'avatars' AND is_admin_or_staff() = true)
  WITH CHECK (bucket_id = 'avatars' AND is_admin_or_staff() = true);

-- blog bucket
CREATE POLICY "Public read access for blog" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog');
CREATE POLICY "Admin upload access for blog" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'blog' AND is_admin_or_staff() = true);
CREATE POLICY "Admin update access for blog" ON storage.objects
  FOR UPDATE USING (bucket_id = 'blog' AND is_admin_or_staff() = true);
CREATE POLICY "Admin delete access for blog" ON storage.objects
  FOR DELETE USING (bucket_id = 'blog' AND is_admin_or_staff() = true);

-- reviews bucket
CREATE POLICY "Public read access for reviews" ON storage.objects
  FOR SELECT USING (bucket_id = 'reviews');
CREATE POLICY "Users upload own review images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'reviews' AND auth.role() = 'authenticated');
CREATE POLICY "Users update own review images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'reviews' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own review images" ON storage.objects
  FOR DELETE USING (bucket_id = 'reviews' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admin manage all review images" ON storage.objects
  FOR ALL USING (bucket_id = 'reviews' AND is_admin_or_staff() = true)
  WITH CHECK (bucket_id = 'reviews' AND is_admin_or_staff() = true);
