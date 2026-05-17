-- ============================================================================
-- Tighten security advisor warnings:
--   1. Public storage buckets: remove broad public SELECT (listing).
--      Public object URLs still work via bucket.public=true. Allow staff
--      and (for avatars / reviews) the owner to list their own paths.
--   2. SECURITY DEFINER functions: revoke EXECUTE from anon / authenticated.
--      Trigger-only functions don't need any caller grants. RPC functions
--      retain service_role access (used by server-side API routes).
-- ============================================================================

DROP POLICY IF EXISTS "Public read access for products" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for media"    ON storage.objects;
DROP POLICY IF EXISTS "Public read access for avatars"  ON storage.objects;
DROP POLICY IF EXISTS "Public read access for blog"     ON storage.objects;
DROP POLICY IF EXISTS "Public read access for reviews"  ON storage.objects;

CREATE POLICY "Staff list products bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'products' AND is_admin_or_staff());
CREATE POLICY "Staff list media bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'media' AND is_admin_or_staff());
CREATE POLICY "Staff list avatars bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND is_admin_or_staff());
CREATE POLICY "Staff list blog bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog' AND is_admin_or_staff());
CREATE POLICY "Staff list reviews bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'reviews' AND is_admin_or_staff());

CREATE POLICY "Users list own avatar" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users list own review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'reviews' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke RPC access to SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.update_updated_at_column()         FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_product_rating_stats()      FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.handle_new_user()                  FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_admin_or_staff()                FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.mark_order_paid(text, text)        FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.update_customer_stats(text, numeric) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.upsert_customer_from_order(text, text, text, text, text, uuid, jsonb) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.reduce_stock_on_order(uuid)        FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.get_all_customer_emails()          FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.get_all_customer_phones()          FROM anon, authenticated, public;

-- Supabase-managed event-trigger helper (idempotent if function does not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rls_auto_enable' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public';
  END IF;
END $$;
