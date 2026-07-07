/** Storefront display order for top-level categories (admin-defined). */
export const PARENT_CATEGORY_ORDER = [
  'necklaces',
  'bracelets',
  'earrings',
  'rings',
  'bangles',
  'watch',
] as const;

export function sortParentCategories<T extends { slug: string; name?: string }>(items: T[]): T[] {
  const rank = new Map<string, number>(
    PARENT_CATEGORY_ORDER.map((slug, i) => [slug, i])
  );
  return [...items].sort((a, b) => {
    const ai = rank.get(a.slug) ?? 999;
    const bi = rank.get(b.slug) ?? 999;
    if (ai !== bi) return ai - bi;
    return (a.name ?? a.slug).localeCompare(b.name ?? b.slug);
  });
}
