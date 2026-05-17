# Supabase Row Level Security (RLS) Setup

## Why this matters

The Supabase anon key is public (visible in browser JavaScript). Without
Row Level Security, anyone can query every table directly using that key.
Enable RLS on all tables, then add policies that restrict reads/writes
to the appropriate auth role.

## Enabling RLS

Open your Supabase dashboard:

```
https://supabase.com/dashboard/project/YOUR_PROJECT_REF
```

Navigate to **Database → Tables** (or **Table Editor**). For each table
below, click on the table, go to **RLS** (or **Policies**), enable RLS,
and add the policies listed.

## Recommended policies

> A complete script that applies all of these is available at
> `scripts/apply-rls-direct.mjs` and `scripts/enable-rls.sql`.

### Table: `orders`

```sql
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
```

### Table: `order_items`

```sql
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
  )
);
```

### Table: `profiles`

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### Table: `customers` (admin/staff only)

```sql
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only"
ON customers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
  )
);
```

### Public-read tables

`products`, `product_images`, `product_variants`, `categories`, `banners`,
`store_modules`, `reviews`, `review_images`, `coupons`, `blog_posts`,
`pages`, `cms_content`, `site_settings`, `store_settings`,
`navigation_menus`, `navigation_items`:

```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read <table_name>" ON public.<table_name>
FOR SELECT USING (true);
```

### User-owned tables

`addresses`, `cart_items`, `wishlist_items`:

```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own <table_name>" ON public.<table_name>
FOR ALL USING (auth.uid() = user_id);
```

### Admin-only tables

`notifications`, `audit_logs`:

```sql
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only" ON public.<table_name>
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
  )
);
```

## Required env vars after RLS

Add to `.env.local`:

```
MOOLRE_CALLBACK_SECRET=<generate a strong random string and configure it on the provider's dashboard>
```

This secret verifies payment callbacks are actually from your payment
provider — never trust callbacks without it in production.

## Verification

After enabling RLS:

1. Open browser DevTools console on the storefront.
2. Try `const { data } = await supabase.from('customers').select('*')`
   — it should return an empty array or an error, never customer data.
3. Try `const { data } = await supabase.from('orders').select('*')`
   — it should only return the logged-in user's orders, or empty.

## Code-level hardening already applied

- Payment verify endpoint trusts only the provider's API, not redirect flags.
- Payment initiation always reads amount from the database.
- Payment callback enforces secret verification when configured and rejects
  amount mismatches.
- Middleware does server-side auth checks on every `/admin` route.
- Notifications API requires admin auth for sensitive types.
- Order tracking requires email verification.
- Test SMS endpoint requires an admin auth token.
- All user-supplied HTML is escaped before rendering.
- Security headers added: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`.
