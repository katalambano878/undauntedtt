-- Reverts the storewide 10% sale applied 2026-07-10 (ends 2026-07-17).
-- Restores each product's price from metadata->>'pre_sale_price', clears the
-- strikethrough compare_at_price, and removes the sale bookkeeping keys.
-- Safe to run at any time; only touches products that carry the backup key.
--
-- Extra safety net: scripts/backups/price-backup-2026-07-10.csv holds a full
-- dump of every product's price taken immediately before the sale.

UPDATE public.products
SET price = ROUND((metadata->>'pre_sale_price')::numeric, 2),
    compare_at_price = NULL,
    metadata = metadata - 'pre_sale_price' - 'sale_percent' - 'sale_applied_at' - 'sale_ends_at',
    updated_at = now()
WHERE metadata ? 'pre_sale_price';

-- Verification: both counts should be 0 after the revert.
SELECT count(*) AS still_discounted FROM public.products WHERE metadata ? 'pre_sale_price';
SELECT count(*) AS still_showing_sale FROM public.products WHERE compare_at_price IS NOT NULL AND compare_at_price > 0;
