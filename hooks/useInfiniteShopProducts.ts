'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cachedQuery, invalidateCachePrefix } from '@/lib/query-cache';
import { getColorHex, type ColorVariant } from '@/components/ProductCard';

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  inStock: boolean;
  maxStock: number;
  moq: number;
  category?: string;
  hasVariants: boolean;
  minVariantPrice?: number;
  colorVariants: ColorVariant[];
};

type CategoryRow = {
  id: string;
  slug?: string;
  parent_id?: string | null;
  name?: string;
};

/** Parent categories hold 0 products — items live on children. Include self + direct children. */
export function resolveCategoryIds(
  selectedSlug: string,
  categories: CategoryRow[]
): string[] | null {
  if (!selectedSlug || selectedSlug === 'all') return null;
  const match = categories.find((c) => c.slug === selectedSlug);
  if (!match) return [];
  const childIds = categories
    .filter((c) => c.parent_id === match.id)
    .map((c) => c.id);
  return [match.id, ...childIds];
}

type UseInfiniteShopProductsArgs = {
  selectedCategory: string;
  priceRange: [number, number];
  selectedRating: number;
  sortBy: string;
  search: string | null;
  categories: CategoryRow[];
  /** Page size — keep modest for fast first paint; scroll loads more. */
  pageSize?: number;
};

function formatProduct(p: any): ShopProduct {
  const imgs = (p.product_images || [])
    .slice()
    .sort((a: { position?: number }, b: { position?: number }) => (a.position ?? 0) - (b.position ?? 0));
  const variants = p.product_variants || [];
  const hasVariants = variants.length > 0;
  const minVariantPrice = hasVariants
    ? Math.min(...variants.map((v: any) => v.price || p.price))
    : undefined;
  const totalVariantStock = hasVariants
    ? variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0)
    : 0;
  const effectiveStock = hasVariants ? totalVariantStock : p.quantity;

  const colorVariants: ColorVariant[] = [];
  const seenColors = new Set<string>();
  for (const v of variants) {
    const colorName = v.option2;
    if (colorName && !seenColors.has(colorName.toLowerCase().trim())) {
      const hex = getColorHex(colorName);
      if (hex) {
        seenColors.add(colorName.toLowerCase().trim());
        colorVariants.push({ name: colorName.trim(), hex });
      }
    }
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    originalPrice: p.compare_at_price,
    image: imgs[0]?.url || '',
    rating: p.rating_avg || 0,
    reviewCount: 0,
    badge: p.compare_at_price > p.price ? 'Sale' : undefined,
    inStock: effectiveStock > 0,
    maxStock: effectiveStock || 50,
    moq: p.moq || 1,
    category: p.categories?.name,
    hasVariants,
    minVariantPrice,
    colorVariants,
  };
}

/**
 * Infinite product listing for /shop (including ?category= filters).
 * Loads pages on demand; cancels stale responses when filters change.
 */
export function useInfiniteShopProducts({
  selectedCategory,
  priceRange,
  selectedRating,
  sortBy,
  search,
  categories,
  pageSize = 24,
}: UseInfiniteShopProductsArgs) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchSeq = useRef(0);
  const loadingMoreLock = useRef(false);
  // Need the real category tree (not the placeholder) before filtering by category.
  const categoryTreeReady = categories.some((c) => c.id !== 'all' && c.slug);
  const categoriesReady = selectedCategory === 'all' || categoryTreeReady;

  const categoryIds = useMemo(
    () => (categoriesReady ? resolveCategoryIds(selectedCategory, categories) : null),
    [categoriesReady, selectedCategory, categories]
  );
  // Include resolved IDs in the key so parent→children expansion isn't cache-poisoned.
  const categoryKey =
    selectedCategory === 'all'
      ? 'all'
      : categoryIds && categoryIds.length
        ? `ids:${[...categoryIds].sort().join(',')}`
        : `slug:${selectedCategory}`;

  // Reset to page 1 whenever filters change (not when page increments).
  const filterKey = `${categoryKey}|${search || ''}|${priceRange.join('-')}|${selectedRating}|${sortBy}`;
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setPage(1);
      setProducts([]);
      setTotalProducts(0);
      loadingMoreLock.current = false;
    }
  }, [filterKey]);

  useEffect(() => {
    if (!categoriesReady) return;
    // Unknown category slug with an empty ID list → show empty, don't fall back to all.
    if (selectedCategory !== 'all' && categoryIds && categoryIds.length === 0) {
      setProducts([]);
      setTotalProducts(0);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const seq = ++fetchSeq.current;
    const isFirstPage = page === 1;

    async function fetchProducts() {
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      setFetchError(null);

      try {
        const cacheKey = `shop:v3:${filterKey}:${page}:${pageSize}`;

        const { data, count, error } = await cachedQuery<{
          data: any;
          count: any;
          error: any;
        }>(
          cacheKey,
          async () => {
            // Lean select — only fields the card needs (fast embeds).
            let query = supabase
              .from('products')
              .select(
                `
                id, slug, name, price, compare_at_price, quantity, moq, rating_avg, status, category_id,
                categories(name, slug),
                product_images(url, position),
                product_variants(id, price, quantity, option2)
              `,
                { count: 'exact' }
              )
              .eq('status', 'active');

            if (search) {
              query = query.ilike('name', `%${search}%`);
            }

            // Filter by category_id (self + children for parents). Avoid nested
            // categories.slug filters that miss parent collections (0 direct products).
            if (categoryIds && categoryIds.length > 0) {
              query = query.in('category_id', categoryIds);
            }

            if (priceRange[1] < 5000) {
              query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);
            }

            // All catalog ratings are currently 0 — applying gte would empty the grid.
            // Only filter when the product actually meets the threshold.
            if (selectedRating > 0) {
              query = query.gte('rating_avg', selectedRating);
            }

            switch (sortBy) {
              case 'price-low':
                query = query.order('price', { ascending: true });
                break;
              case 'price-high':
                query = query.order('price', { ascending: false });
                break;
              case 'rating':
                query = query.order('rating_avg', { ascending: false });
                break;
              case 'new':
              case 'popular':
              default:
                query = query.order('created_at', { ascending: false });
                break;
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            return query;
          },
          2 * 60 * 1000
        );

        if (seq !== fetchSeq.current) return;

        if (error) throw error;

        if (data && Array.isArray(data)) {
          const formatted = data.map(formatProduct);
          setProducts((prev) => {
            if (isFirstPage) return formatted;
            const seen = new Set(prev.map((x) => x.id));
            return [...prev, ...formatted.filter((x) => !seen.has(x.id))];
          });
          setTotalProducts(typeof count === 'number' ? count : 0);
        }
      } catch (err: unknown) {
        if (seq !== fetchSeq.current) return;
        const e = err as { message?: string; code?: string; details?: string };
        const msg = e?.message || (err instanceof Error ? err.message : 'Unable to load products');
        console.error('Error fetching products:', msg, e?.code || '', e?.details || '');
        setFetchError(msg);
        if (isFirstPage) {
          setProducts([]);
          setTotalProducts(0);
        }
      } finally {
        if (seq === fetchSeq.current) {
          setLoading(false);
          setLoadingMore(false);
          loadingMoreLock.current = false;
        }
      }
    }

    fetchProducts();
  }, [
    page,
    pageSize,
    filterKey,
    categoriesReady,
    selectedCategory,
    categoryIds,
    search,
    priceRange,
    selectedRating,
    sortBy,
    refreshTick,
  ]);

  const hasMore = products.length < totalProducts;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || loadingMoreLock.current || !hasMore) return;
    loadingMoreLock.current = true;
    setPage((p) => p + 1);
  }, [loading, loadingMore, hasMore]);

  const retry = useCallback(() => {
    invalidateCachePrefix('shop:');
    fetchSeq.current += 1;
    loadingMoreLock.current = false;
    setPage(1);
    setProducts([]);
    setRefreshTick((t) => t + 1);
  }, []);

  const resetToFirstPage = useCallback(() => {
    setPage(1);
    loadingMoreLock.current = false;
  }, []);

  return {
    products,
    totalProducts,
    loading,
    loadingMore,
    hasMore,
    fetchError,
    loadMore,
    retry,
    resetToFirstPage,
    pageSize,
  };
}
