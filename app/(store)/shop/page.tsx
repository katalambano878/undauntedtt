'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePageTitle } from '@/hooks/usePageTitle';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton';
import PageHero from '@/components/PageHero';
import { sortParentCategories } from '@/lib/category-order';
import { useInfiniteShopProducts } from '@/hooks/useInfiniteShopProducts';

function ShopContent() {
  usePageTitle('Shop All Products');
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<any[]>([{ id: 'all', name: 'All Products', count: 0 }]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedRating, setSelectedRating] = useState(0);
  const [sortBy, setSortBy] = useState('popular');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category');
    const sort = searchParams.get('sort');

    if (category) setSelectedCategory(category);
    else setSelectedCategory('all');
    if (sort) setSortBy(sort);
  }, [searchParams]);

  // Keep the active category's parent expanded in the sidebar
  useEffect(() => {
    if (selectedCategory === 'all' || categories.length <= 1) return;
    const selected = categories.find((c) => c.slug === selectedCategory);
    if (!selected) return;
    const parentId = selected.parent_id ?? selected.id;
    if (categories.some((c) => c.parent_id === parentId)) {
      setExpandedParents((prev) => new Set(prev).add(parentId));
    }
  }, [selectedCategory, categories]);

  const toggleParentExpanded = (parentId: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const parentCategories = sortParentCategories(
    categories.filter((c) => !c.parent_id && c.id !== 'all')
  );

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

  const {
    products,
    totalProducts,
    loading,
    loadingMore,
    hasMore,
    fetchError,
    loadMore,
    retry: handleRetry,
    resetToFirstPage,
  } = useInfiniteShopProducts({
    selectedCategory,
    priceRange,
    selectedRating,
    sortBy,
    search: searchParams.get('search'),
    categories,
    pageSize: 24,
  });

  // Infinite scroll — prefetch ~1 viewport ahead for smoothness
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '900px 0px', threshold: 0 }
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
              <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain">
                <div className="bg-brand-cream lg:bg-transparent p-6 lg:p-0 lg:pr-2">
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
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-brand-ink">Categories</h3>
                        {parentCategories.some((p) => categories.some((c) => c.parent_id === p.id)) && (
                          <button
                            type="button"
                            onClick={() => {
                              const withChildren = parentCategories.filter((p) =>
                                categories.some((c) => c.parent_id === p.id)
                              );
                              const allExpanded = withChildren.every((p) => expandedParents.has(p.id));
                              setExpandedParents(
                                allExpanded
                                  ? new Set<string>()
                                  : new Set(withChildren.map((p) => p.id))
                              );
                            }}
                            className="text-xs font-medium text-brand-bronze hover:text-brand-caramel transition-colors"
                          >
                            {parentCategories.every(
                              (p) =>
                                !categories.some((c) => c.parent_id === p.id) || expandedParents.has(p.id)
                            )
                              ? 'Collapse all'
                              : 'Expand all'}
                          </button>
                        )}
                      </div>
                      <div className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-y-contain pr-1 space-y-1 border border-brand-taupe/25 rounded-xl p-2 bg-brand-cream/50">
                        <button
                          onClick={() => {
                            setSelectedCategory('all');
                            resetToFirstPage();
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === 'all'
                            ? 'bg-brand-bronze text-brand-cream font-medium'
                            : 'text-brand-ink/80 hover:bg-brand-cream'
                            }`}
                        >
                          All Products
                        </button>

                        {parentCategories.map((parent) => {
                          const subcategories = categories
                            .filter((c) => c.parent_id === parent.id)
                            .sort((a, b) => a.name.localeCompare(b.name));
                          const isSelected = selectedCategory === parent.slug;
                          const isChildSelected = subcategories.some((sub) => sub.slug === selectedCategory);
                          const isExpanded = expandedParents.has(parent.id) || isChildSelected;
                          const hasChildren = subcategories.length > 0;

                          return (
                            <div key={parent.id} className="space-y-0.5">
                              <div
                                className={`flex items-stretch rounded-lg transition-colors ${isSelected && !isChildSelected
                                  ? 'bg-brand-caramel/20'
                                  : isChildSelected
                                    ? 'bg-brand-caramel/10'
                                    : 'hover:bg-brand-cream'
                                  }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(parent.slug);
                                    resetToFirstPage();
                                    if (hasChildren) {
                                      setExpandedParents((prev) => new Set(prev).add(parent.id));
                                    }
                                  }}
                                  className={`flex-1 text-left px-3 py-2 min-w-0 ${isSelected || isChildSelected
                                    ? 'text-brand-bronze font-medium'
                                    : 'text-brand-ink/80'
                                    }`}
                                >
                                  <span className="block truncate">{parent.name}</span>
                                </button>
                                {hasChildren && (
                                  <button
                                    type="button"
                                    aria-expanded={isExpanded}
                                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${parent.name}`}
                                    onClick={() => toggleParentExpanded(parent.id)}
                                    className="px-2 flex items-center justify-center text-brand-ink/50 hover:text-brand-bronze shrink-0"
                                  >
                                    <i className={`text-lg transition-transform duration-200 ${isExpanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}`}></i>
                                  </button>
                                )}
                              </div>

                              {hasChildren && isExpanded && (
                                <div className="ml-3 border-l-2 border-brand-taupe/30 pl-2 space-y-0.5 pb-1">
                                  {subcategories.map((child) => (
                                    <button
                                      key={child.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCategory(child.slug);
                                        resetToFirstPage();
                                        setIsFilterOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedCategory === child.slug
                                        ? 'text-brand-bronze font-medium bg-brand-caramel/15'
                                        : 'text-brand-ink/70 hover:text-brand-ink hover:bg-brand-cream'
                                        }`}
                                    >
                                      <span className="block truncate">{child.name}</span>
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
                            resetToFirstPage();
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
                              resetToFirstPage();
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
                      resetToFirstPage();
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
                    {products.map((product, index) => (
                      <ProductCard key={product.id} {...product} priority={index < 6} />
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
                            resetToFirstPage();
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