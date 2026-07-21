/** Cart / checkout helpers for product UUID resolution after catalog drift. */

export const isValidUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export type CartLikeItem = {
  id: string;
  name: string;
  slug?: string;
};

export type ResolvedOrderProduct = {
  cartItem: CartLikeItem;
  /** Null when product was deleted / never existed — matches historical Supabase order_items. */
  productId: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Resolve cart line product IDs against the live products table.
 * Missing UUIDs become null (FK-safe) so checkout can still store product_name.
 */
export async function resolveCartProductIds(
  cart: CartLikeItem[],
  fetchByIds: (ids: string[]) => Promise<Array<{ id: string; metadata?: unknown }>>,
  fetchBySlug: (slug: string) => Promise<{ id: string; metadata?: unknown } | null>
): Promise<{ resolved: ResolvedOrderProduct[]; missingNames: string[] }> {
  const uuidIds = cart.map((i) => i.id).filter(isValidUUID);
  const existing = uuidIds.length > 0 ? await fetchByIds(uuidIds) : [];
  const byId = new Map(existing.map((p) => [p.id, p]));

  const resolved: ResolvedOrderProduct[] = [];
  const missingNames: string[] = [];

  for (const item of cart) {
    let productId: string | null = item.id;
    let metadata: Record<string, unknown> | null = null;

    if (!isValidUUID(item.id)) {
      const product = await fetchBySlug(item.id);
      if (product) {
        productId = product.id;
        metadata = (product.metadata as Record<string, unknown>) || null;
      } else {
        productId = null;
        missingNames.push(item.name);
      }
    } else {
      const product = byId.get(item.id);
      if (product) {
        metadata = (product.metadata as Record<string, unknown>) || null;
      } else {
        // Stale localStorage / deleted catalog row — do not send orphan UUID (FK fail)
        productId = null;
        missingNames.push(item.name);
      }
    }

    resolved.push({ cartItem: item, productId, metadata });
  }

  return { resolved, missingNames };
}
