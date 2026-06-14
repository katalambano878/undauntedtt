'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePageTitle } from '@/hooks/usePageTitle';
import ProductCard, { type ColorVariant } from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton';
import { getColorHex } from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { cachedQuery, invalidateCachePrefix } from '@/lib/query-cache';
import PageHero from '@/components/PageHero';

function ShopContent() {
  usePageTitle('Shop All Products');
  const searchParams = useSearchParams();

  // State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([{ id: 'all', name: 'All Products', count: 0 }]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedRating, setSelectedRating] = useState(0);
  const [sortBy, setSortBy] = useState('popular');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const productsPerPage = 12;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category');
    const sort = searchParams.get('sort');
    const search = searchParams.get('search');

    if (category) setSelectedCategory(category);
    if (sort) setSortBy(sort);
    // Search is handled in the fetch function via searchParams directly or we could add a state for it
  }, [searchParams]);

  // Fetch Categories from cached API
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/storefront/categories');
        if (res.ok) {
          const data = await res.json();
          if (data) setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch Products
  useEffect(() => {
    async function fetchProducts() {
      const isFirstPage = page === 1;
      if (isFirstPage) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setFetchError(null);
      try {
        const search = searchParams.get('search');

        // Build cache key from all filter params
        const cacheKey = `shop:${selectedCategory}:${search || ''}:${priceRange.join('-')}:${selectedRating}:${sortBy}:${page}`;

        const { data, count, error } = await cachedQuery<{ data: any; count: any; error: any }>(
          cacheKey,
          async () => {
            // Left join categories so products without category_id still load (!inner hid them all)
            let query = supabase
              .from('products')
              .select(`
                *,
                categories(name, slug),
                product_images(url, position),
                product_variants(id, name, price, quantity, option1, option2, image_url)
              `, { count: 'exact' })
              .eq('status', 'active');

            // Search
            if (search) {
              query = query.ilike('name', `%${search}%`);
            }

            // Category Filter with Subcategories
            if (selectedCategory !== 'all') {
              const categoryObj = categories.find(c => c.slug === selectedCategory);

              if (categoryObj) {
                const targetSlugs = [selectedCategory];
                const childSlugs = categories
                  .filter(c => c.parent_id === categoryObj.id)
                  .map(c => c.slug);
                targetSlugs.push(...childSlugs);
                query = query.in('categories.slug', targetSlugs);
              } else {
                query = query.eq('categories.slug', selectedCategory);
              }
            }

            // Price Filter
            if (priceRange[1] < 5000) {
              query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);
            }

            // Rating Filter
            if (selectedRating > 0) {
              query = query.gte('rating_avg', selectedRating);
            }

            // Sorting
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
                query = query.order('created_at', { ascending: false });
                break;
              case 'popular':
              default:
                query = query.order('created_at', { ascending: false });
                break;
            }

            // Pagination
            const from = (page - 1) * productsPerPage;
            const to = from + productsPerPage - 1;
            query = query.range(from, to);

            const result = await query;
            return result;
          },
          2 * 60 * 1000 // Cache for 2 minutes
        );

        if (error) {
          console.error('[Shop] Supabase error:', error.message, error.code, error.details, error.hint);
          throw error;
        }

        if (data && Array.isArray(data)) {
          const formattedProducts = data.map((p: any) => {
            const imgs = (p.product_images || []).slice().sort((a: { position?: number }, b: { position?: number }) => (a.position ?? 0) - (b.position ?? 0));
            const variants = p.product_variants || [];
            const hasVariants = variants.length > 0;
            const minVariantPrice = hasVariants ? Math.min(...variants.map((v: any) => v.price || p.price)) : undefined;
            const totalVariantStock = hasVariants ? variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) : 0;
            const effectiveStock = hasVariants ? totalVariantStock : p.quantity;
            // Extract unique colors from option2
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
              id: p.id,           // Product UUID for cart/orders
              slug: p.slug,       // Slug for navigation
              name: p.name,
              price: p.price,
              originalPrice: p.compare_at_price,
              image: imgs[0]?.url || '',
              rating: p.rating_avg || 0,
              reviewCount: 0, // Need to implement reviews relation
              badge: p.compare_at_price > p.price ? 'Sale' : undefined, // Simple badge logic
              inStock: effectiveStock > 0,
              maxStock: effectiveStock || 50,
              moq: p.moq || 1,
              category: p.categories?.name,
              hasVariants,
              minVariantPrice,
              colorVariants
            };
          });
          setProducts((prev) => {
            if (isFirstPage) return formattedProducts;
            // De-dupe in case of overlapping ranges
            const seen = new Set(prev.map((x) => x.id));
            return [...prev, ...formattedProducts.filter((x) => !seen.has(x.id))];
          });
          setTotalProducts(count || 0);
        }
      } catch (err: unknown) {
        const e = err as { message?: string; code?: string; details?: string };
        const msg = e?.message || (err instanceof Error ? err.message : 'Unable to load products');
        console.error('Error fetching products:', msg, e?.code || '', e?.details || '');
        setFetchError(msg);
        if (isFirstPage) {
          setProducts([]);
          setTotalProducts(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }

    fetchProducts();
  }, [selectedCategory, priceRange, selectedRating, sortBy, page, searchParams, categories, refreshTick]);

  const handleRetry = () => {
    invalidateCachePrefix('shop:');
    setPage(1);
    setRefreshTick((t) => t + 1);
  };

  const hasMore = products.length < totalProducts;

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  // Infinite scroll: load the next page when the sentinel enters the viewport
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, loadMore, products.length]);

  return (
    <main className="min-h-screen bg-brand-cream">
      <PageHero
        title="Shop All Products"
        subtitle="Browse our jewelry collection — necklaces, earrings, bracelets and more"
        backgroundImage="/page-hero-2.png"
      />

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden bg-brand-cream border-b border-brand-taupe/40 py-4 px-4 sticky top-[72px] z-20">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center space-x-2 text-brand-ink font-medium"
          >
            <i className="ri-filter-3-line text-xl"></i>
            <span>Filters & Sort</span>
          </button>
          <span className="text-sm text-brand-ink/60">{totalProducts} Products</span>
        </div>
      </div>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className={`${isFilterOpen ? 'fixed inset-0 z-50 bg-brand-cream overflow-y-auto' : 'hidden'} lg:block lg:w-64 lg:flex-shrink-0`}>
              <div className="lg:sticky lg:top-24">
                <div className="bg-brand-cream lg:bg-transparent p-6 lg:p-0">
                  <div className="flex items-center justify-between mb-6 lg:hidden">
                    <h2 className="text-xl font-bold text-brand-ink">Filters</h2>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-10 h-10 flex items-center justify-center text-brand-ink/70"
                    >
                      <i className="ri-close-line text-2xl"></i>
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Categories */}
                    <div>
                      <h3 className="font-semibold text-brand-ink mb-4">Categories</h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setSelectedCategory('all');
                            setPage(1);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedCategory === 'all'
                            ? 'bg-brand-bronze text-brand-cream font-medium'
                            : 'text-brand-ink/80 hover:bg-brand-cream'
                            }`}
                        >
                          All Products
                        </button>

                        {/* Parent Categories */}
                        {categories.filter(c => !c.parent_id && c.id !== 'all').map(parent => {
                          const subcategories = categories.filter(c => c.parent_id === parent.id);
                          const isSelected = selectedCategory === parent.slug;
                          const isChildSelected = subcategories.some(sub => sub.slug === selectedCategory);
                          const isOpen = isSelected || isChildSelected; // Auto-expand if selected

                          return (
                            <div key={parent.id} className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedCategory(parent.slug);
                                  setPage(1);
                                  // Don't close filter immediately if exploring hierarchy
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex justify-between items-center ${isSelected
                                  ? 'bg-brand-caramel/20 text-brand-bronze font-medium'
                                  : 'text-brand-ink/80 hover:bg-brand-cream'
                                  }`}
                              >
                                <span>{parent.name}</span>
                              </button>

                              {/* Subcategories */}
                              {subcategories.length > 0 && (
                                <div className="ml-4 border-l-2 border-brand-taupe/30 pl-2 space-y-1">
                                  {subcategories.map(child => (
                                    <button
                                      key={child.id}
                                      onClick={() => {
                                        setSelectedCategory(child.slug);
                                        setPage(1);
                                        setIsFilterOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-1.5 rounded-lg text-sm transition-colors ${selectedCategory === child.slug
                                        ? 'text-brand-bronze font-medium bg-brand-caramel/15'
                                        : 'text-brand-ink/70 hover:text-brand-ink hover:bg-brand-cream'
                                        }`}
                                    >
                                      {child.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="border-t border-brand-taupe/40 pt-8">
                      <h3 className="font-semibold text-brand-ink mb-4">Max Price: GH₵{priceRange[1]}</h3>
                      <div className="space-y-4">
                        <input
                          type="range"
                          min="0"
                          max="5000"
                          step="50"
                          value={priceRange[1]}
                          onChange={(e) => {
                            setPriceRange([0, parseInt(e.target.value)]);
                            setPage(1);
                          }}
                          className="w-full h-2 bg-brand-taupe/40 rounded-lg appearance-none cursor-pointer accent-brand-bronze"
                        />
                        <div className="flex items-center justify-between text-sm text-brand-ink/60">
                          <span>GH₵0</span>
                          <span>GH₵5000+</span>
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="border-t border-brand-taupe/40 pt-8">
                      <h3 className="font-semibold text-brand-ink mb-4">Rating</h3>
                      <div className="space-y-2">
                        {[4, 3, 2, 1].map(rating => (
                          <button
                            key={rating}
                            onClick={() => {
                              setSelectedRating(rating === selectedRating ? 0 : rating);
                              setPage(1);
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedRating === rating
                              ? 'bg-brand-caramel/20 text-brand-bronze'
                              : 'text-brand-ink/80 hover:bg-brand-cream'
                              }`}
                          >
                            <div className="flex items-center space-x-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <i
                                  key={star}
                                  className={`${star <= rating ? 'ri-star-fill text-brand-gold' : 'ri-star-line text-brand-taupe'} text-sm`}
                                ></i>
                              ))}
                              <span className="text-sm">& Up</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Re-fetch handled by effect dependencies
                        setIsFilterOpen(false);
                      }}
                      className="w-full bg-brand-bronze hover:bg-brand-caramel text-brand-cream py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      Show Results
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <p className="text-brand-ink/70">
                  Showing <span className="font-semibold text-brand-ink">{products.length}</span> of <span className="font-semibold text-brand-ink">{totalProducts}</span> products
                </p>

                <div className="flex items-center space-x-3">
                  <label className="text-sm text-brand-ink/70 whitespace-nowrap">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="px-4 py-2 pr-8 border border-brand-taupe rounded-lg focus:ring-2 focus:ring-brand-caramel focus:border-brand-caramel text-sm bg-brand-cream cursor-pointer text-brand-ink"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="new">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:gap-8">
                  {[...Array(6)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-6 sm:gap-6 md:gap-8" data-product-shop>
                    {products.map(product => (
                      <ProductCard key={product.id} {...product} />
                    ))}
                  </div>

                  {products.length === 0 && fetchError && (
                    <div className="text-center py-20">
                      <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-red-50 rounded-full">
                        <i className="ri-error-warning-line text-4xl text-red-500"></i>
                      </div>
                      <h3 className="text-2xl font-bold text-brand-ink mb-2">We couldn&apos;t load products</h3>
                      <p className="text-brand-ink/70 mb-2">There was a problem reaching our catalogue. Please try again.</p>
                      <p className="text-xs text-brand-ink/40 mb-8 break-all max-w-md mx-auto">{fetchError}</p>
                      <button
                        onClick={handleRetry}
                        className="inline-flex items-center bg-brand-bronze hover:bg-brand-caramel text-brand-cream px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                      >
                        <i className="ri-refresh-line mr-2"></i>
                        Retry
                      </button>
                    </div>
                  )}

                  {products.length === 0 && !fetchError && (
                    <div className="text-center py-20">
                      <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-brand-ice rounded-full">
                        <i className="ri-inbox-line text-4xl text-brand-taupe"></i>
                      </div>
                      <h3 className="text-2xl font-bold text-brand-ink mb-2">No Products Found</h3>
                      <p className="text-brand-ink/70 mb-8">Try adjusting your filters to find what you&apos;re looking for</p>
                      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                        <button
                          onClick={() => {
                            setSelectedCategory('all');
                            setPriceRange([0, 5000]);
                            setSelectedRating(0);
                            setPage(1);
                          }}
                          className="inline-flex items-center bg-brand-bronze hover:bg-brand-caramel text-brand-cream px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          Clear All Filters
                        </button>
                        <button
                          onClick={handleRetry}
                          className="inline-flex items-center bg-brand-cream border border-brand-taupe hover:border-brand-caramel text-brand-ink/80 hover:text-brand-caramel px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap"
                        >
                          <i className="ri-refresh-line mr-2"></i>
                          Refresh
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Infinite scroll loader / sentinel */}
              {!loading && products.length > 0 && (
                <>
                  {loadingMore && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-6 sm:gap-6 md:gap-8 mt-6 sm:mt-8">
                      {[...Array(3)].map((_, i) => (
                        <ProductCardSkeleton key={`more-${i}`} />
                      ))}
                    </div>
                  )}

                  {/* Sentinel: when this scrolls into view, the next page loads */}
                  {hasMore && <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />}

                  {!hasMore && (
                    <p className="mt-12 text-center text-sm text-brand-ink/50">
                      You&apos;ve reached the end — {totalProducts} {totalProducts === 1 ? 'product' : 'products'}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-brand-cream"><div className="w-12 h-12 border-4 border-brand-bronze border-t-transparent rounded-full animate-spin"></div></div>}>
      <ShopContent />
    </Suspense>
  );
}