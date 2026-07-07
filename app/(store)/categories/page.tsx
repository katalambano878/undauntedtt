import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PageHero from '@/components/PageHero';
import { sortParentCategories } from '@/lib/category-order';

export const revalidate = 0;

const palette = [
  { color: 'from-[#bd956a] to-[#8e623b]', icon: 'ri-store-2-line' },
  { color: 'from-[#c3b19b] to-[#8e623b]', icon: 'ri-shopping-bag-3-line' },
  { color: 'from-[#d4af37] to-[#8e623b]', icon: 'ri-t-shirt-line' },
  { color: 'from-[#bd956a] to-[#5e3f1f]', icon: 'ri-home-smile-line' },
  { color: 'from-[#d4af37] to-[#bd956a]', icon: 'ri-heart-line' },
  { color: 'from-[#8e623b] to-[#5e3f1f]', icon: 'ri-star-smile-line' },
];

export default async function CategoriesPage() {
  const { data: categoriesData } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      description,
      image_url,
      parent_id,
      position
    `)
    .eq('status', 'active')
    .order('name', { ascending: true });

  const parents = sortParentCategories(
    (categoriesData ?? []).filter((c) => !c.parent_id)
  );

  const childrenByParent = new Map<string, NonNullable<typeof categoriesData>>();
  for (const cat of categoriesData ?? []) {
    if (!cat.parent_id) continue;
    const list = childrenByParent.get(cat.parent_id) ?? [];
    list.push(cat);
    childrenByParent.set(cat.parent_id, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <PageHero
        title="Shop by Category"
        subtitle="Pick a collection, then choose the type that fits you"
        backgroundImage="/page-hero-4.png"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 sm:space-y-14">
        {parents.length > 0 ? (
          parents.map((parent, i) => {
            const style = palette[i % palette.length];
            const image = parent.image_url || 'https://via.placeholder.com/600x400?text=Category';
            const subcategories = childrenByParent.get(parent.id) ?? [];

            return (
              <section
                key={parent.id}
                className="bg-brand-cream border border-brand-taupe/40 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                  <Link
                    href={`/shop?category=${parent.slug}`}
                    className="group relative min-h-[180px] sm:min-h-[220px] overflow-hidden"
                  >
                    <img
                      src={image}
                      alt={parent.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${style.color} opacity-35`} />
                    <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 bg-gradient-to-br ${style.color} rounded-full flex items-center justify-center shrink-0`}>
                          <i className={`${style.icon} text-xl text-brand-cream`} />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold text-brand-cream drop-shadow">{parent.name}</h2>
                          <p className="text-sm text-brand-cream/90">Browse all {parent.name.toLowerCase()}</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="p-5 sm:p-6 md:p-8">
                    <p className="text-sm font-semibold text-brand-ink/60 uppercase tracking-wide mb-4">
                      Shop by type
                    </p>
                    {subcategories.length > 0 ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {subcategories.map((child) => {
                          const childImage = child.image_url || null;
                          return (
                            <Link
                              key={child.id}
                              href={`/shop?category=${child.slug}`}
                              className="group overflow-hidden rounded-xl border border-brand-taupe/30 bg-white/60 hover:border-brand-caramel hover:shadow-md transition-all"
                            >
                              <div className="relative aspect-[4/3] bg-brand-cream overflow-hidden">
                                {childImage ? (
                                  <img
                                    src={childImage}
                                    alt={child.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-cream to-brand-taupe/20">
                                    <i className={`${style.icon} text-3xl text-brand-bronze/40`} />
                                  </div>
                                )}
                              </div>
                              <div className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2">
                                <span className="font-medium text-sm sm:text-base text-brand-ink group-hover:text-brand-bronze line-clamp-2">
                                  {child.name}
                                </span>
                                <i className="ri-arrow-right-s-line text-brand-bronze shrink-0" />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <Link
                        href={`/shop?category=${parent.slug}`}
                        className="inline-flex items-center gap-2 text-brand-bronze font-medium hover:text-brand-caramel"
                      >
                        View collection
                        <i className="ri-arrow-right-line" />
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            );
          })
        ) : (
          <div className="text-center py-20 bg-brand-ice rounded-xl">
            <i className="ri-inbox-line text-5xl text-brand-taupe mb-4" />
            <p className="text-xl text-brand-ink/60">No categories found.</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-brand-caramel to-brand-bronze py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-cream mb-3 sm:mb-4">Can&apos;t Find What You&apos;re Looking For?</h2>
          <p className="text-base sm:text-lg md:text-xl text-brand-cream/90 mb-6 sm:mb-8 leading-relaxed">
            Try our advanced search or contact our team for personalised product recommendations
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-brand-cream text-brand-bronze px-5 sm:px-8 py-3 sm:py-4 rounded-full font-medium text-sm sm:text-base hover:bg-white transition-colors whitespace-nowrap"
            >
              <i className="ri-search-line" />
              Search All Products
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-brand-bronze text-brand-cream border border-brand-cream/30 px-5 sm:px-8 py-3 sm:py-4 rounded-full font-medium text-sm sm:text-base hover:bg-[#5e3f1f] transition-colors whitespace-nowrap"
            >
              <i className="ri-customer-service-line" />
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
