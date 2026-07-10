-- Bump coupon usage_count when an order that redeemed a coupon is marked paid.
-- Guarded by a 'coupon_counted' metadata flag so retries/webhook+verify races
-- can't double-count.

CREATE OR REPLACE FUNCTION public.mark_order_paid(order_ref text, moolre_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_order orders;
  v_coupon_id uuid;
BEGIN
  -- 1. Update the order to paid
  UPDATE orders
  SET 
    payment_status = 'paid',
    status = CASE 
        WHEN status = 'pending' THEN 'processing'::order_status
        WHEN status = 'awaiting_payment' THEN 'processing'::order_status
        ELSE status
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) || 
               jsonb_build_object(
                   'moolre_reference', moolre_ref,
                   'payment_verified_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
               )
  WHERE order_number = order_ref
  RETURNING * INTO updated_order;

  -- 2. Reduce stock (only if we found the order and haven't reduced yet)
  IF updated_order.id IS NOT NULL THEN
      IF (updated_order.metadata->>'stock_reduced') IS NULL THEN
          
          -- Reduce main product stock
          UPDATE products p
          SET quantity = GREATEST(0, p.quantity - oi.quantity)
          FROM order_items oi
          WHERE oi.order_id = updated_order.id
            AND oi.product_id = p.id;

          -- Reduce variant stock (match by product_id + variant_name)
          UPDATE product_variants pv
          SET quantity = GREATEST(0, pv.quantity - oi.quantity)
          FROM order_items oi
          WHERE oi.order_id = updated_order.id
            AND oi.product_id = pv.product_id
            AND oi.variant_name IS NOT NULL
            AND oi.variant_name = pv.name;
            
          -- Flag as reduced
          UPDATE orders 
          SET metadata = metadata || '{"stock_reduced": true}'::jsonb
          WHERE id = updated_order.id;
          
      END IF;

      -- 3. Count coupon redemption once per order
      IF (updated_order.metadata->>'coupon_id') IS NOT NULL
         AND (updated_order.metadata->>'coupon_counted') IS NULL THEN
          BEGIN
              v_coupon_id := (updated_order.metadata->>'coupon_id')::uuid;

              UPDATE coupons
              SET usage_count = COALESCE(usage_count, 0) + 1,
                  updated_at = now()
              WHERE id = v_coupon_id;

              UPDATE orders
              SET metadata = metadata || '{"coupon_counted": true}'::jsonb
              WHERE id = updated_order.id;
          EXCEPTION WHEN invalid_text_representation THEN
              -- Malformed coupon_id in metadata; skip counting rather than
              -- failing the payment confirmation.
              NULL;
          END;
      END IF;
  ELSE
      -- Fallback search
      SELECT * INTO updated_order FROM orders WHERE order_number = order_ref;
  END IF;

  RETURN to_jsonb(updated_order);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(text, text) FROM anon, authenticated, public;
