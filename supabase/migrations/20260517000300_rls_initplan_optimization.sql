-- ============================================================================
-- Replace `auth.uid()` / `auth.role()` with `(SELECT auth.uid())` so Postgres
-- treats them as initPlan-cached (evaluated once per query, not per row).
-- See https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Addresses
DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Orders
DROP POLICY IF EXISTS "Enable insert for all users" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Enable insert for all users" ON public.orders FOR INSERT
  WITH CHECK ((((SELECT auth.uid()) IS NOT NULL) AND ((SELECT auth.uid()) = user_id))
           OR (((SELECT auth.uid()) IS NULL) AND (user_id IS NULL)));
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Order Items
DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Enable insert for order items" ON public.order_items;
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = (SELECT auth.uid())));
CREATE POLICY "Enable insert for order items" ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = (SELECT auth.uid()) OR orders.user_id IS NULL)));

-- Order Status History
DROP POLICY IF EXISTS "Users view order history" ON public.order_status_history;
CREATE POLICY "Users view order history" ON public.order_status_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.user_id = (SELECT auth.uid())));

-- Cart Items
DROP POLICY IF EXISTS "Users manage own cart" ON public.cart_items;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Wishlist
DROP POLICY IF EXISTS "Users manage own wishlist" ON public.wishlist_items;
CREATE POLICY "Users manage own wishlist" ON public.wishlist_items FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Reviews
DROP POLICY IF EXISTS "Users view own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users view own reviews" ON public.reviews FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create reviews" ON public.reviews FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own reviews" ON public.reviews FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Review Images
DROP POLICY IF EXISTS "Users manage review images" ON public.review_images;
CREATE POLICY "Users manage review images" ON public.review_images FOR ALL
  USING (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_images.review_id AND reviews.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_images.review_id AND reviews.user_id = (SELECT auth.uid())));

-- Support Tickets
DROP POLICY IF EXISTS "Users manage own tickets" ON public.support_tickets;
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Support Messages
DROP POLICY IF EXISTS "Users view ticket messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users create messages" ON public.support_messages;
CREATE POLICY "Users view ticket messages" ON public.support_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = (SELECT auth.uid())));
CREATE POLICY "Users create messages" ON public.support_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_messages.ticket_id AND support_tickets.user_id = (SELECT auth.uid())));

-- Return Requests
DROP POLICY IF EXISTS "Users view own returns" ON public.return_requests;
DROP POLICY IF EXISTS "Users create returns" ON public.return_requests;
CREATE POLICY "Users view own returns" ON public.return_requests FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create returns" ON public.return_requests FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- Return Items
DROP POLICY IF EXISTS "Users view return items" ON public.return_items;
CREATE POLICY "Users view return items" ON public.return_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM return_requests WHERE return_requests.id = return_items.return_request_id AND return_requests.user_id = (SELECT auth.uid())));

-- Notifications
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Coupons
DROP POLICY IF EXISTS "Allow admin insert on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow admin update on coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow admin delete on coupons" ON public.coupons;
CREATE POLICY "Allow admin insert on coupons" ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role IN ('admin','staff')));
CREATE POLICY "Allow admin update on coupons" ON public.coupons FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role IN ('admin','staff')));
CREATE POLICY "Allow admin delete on coupons" ON public.coupons FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role IN ('admin','staff')));

-- Pages, site_settings, cms_content, banners, navigation_*
DROP POLICY IF EXISTS "Staff can manage pages" ON public.pages;
DROP POLICY IF EXISTS "Allow admin write on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow admin all on cms_content" ON public.cms_content;
DROP POLICY IF EXISTS "Allow admin all on banners" ON public.banners;
DROP POLICY IF EXISTS "Allow admin all on navigation_menus" ON public.navigation_menus;
DROP POLICY IF EXISTS "Allow admin all on navigation_items" ON public.navigation_items;
CREATE POLICY "Staff can manage pages" ON public.pages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role IN ('admin','staff')));
CREATE POLICY "Allow admin write on site_settings" ON public.site_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role));
CREATE POLICY "Allow admin all on cms_content" ON public.cms_content FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role));
CREATE POLICY "Allow admin all on banners" ON public.banners FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role));
CREATE POLICY "Allow admin all on navigation_menus" ON public.navigation_menus FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role));
CREATE POLICY "Allow admin all on navigation_items" ON public.navigation_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role));

-- Store Modules
DROP POLICY IF EXISTS "Allow admin insert on store_modules" ON public.store_modules;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.store_modules;
CREATE POLICY "Allow admin insert on store_modules" ON public.store_modules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role IN ('admin','staff')));
CREATE POLICY "Allow authenticated update" ON public.store_modules FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated' OR (SELECT auth.role()) = 'anon');

-- Customers
DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Service role full access to customers" ON public.customers;
CREATE POLICY "Staff can view all customers" ON public.customers FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role IN ('admin','staff')));
CREATE POLICY "Staff can manage customers" ON public.customers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role IN ('admin','staff')));
CREATE POLICY "Service role full access to customers" ON public.customers FOR ALL
  USING ((SELECT auth.role()) = 'service_role');
