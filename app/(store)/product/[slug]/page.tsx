import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteName } from '@/lib/site-defaults';
import ProductDetailClient from './ProductDetailClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface ProductSeoData {
  name: string;
  description: string | null;
  short_description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: string | null;
  tags?: string[] | null;
  product_images?: { url: string; position: number | null }[] | null;
  category?: { name: string } | null;
}

async function fetchProductForSeo(slug: string): Promise<ProductSeoData | null> {
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('products')
      .select(
        `name, description, short_description, seo_title, seo_description, status, tags,
         product_images(url, position),
         category:categories(name)`,
      )
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.warn('[product-seo] fetch error', error.message);
      return null;
    }
    return (data as unknown as ProductSeoData) || null;
  } catch (err) {
    console.warn('[product-seo] fetch failed', err);
    return null;
  }
}

function pickBestImage(p: ProductSeoData): string | undefined {
  const imgs = p.product_images || [];
  if (!imgs.length) return undefined;
  const sorted = [...imgs].sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
  return sorted[0]?.url || undefined;
}

function plainText(s: string | null | undefined, max = 160): string {
  if (!s) return '';
  const stripped = String(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductForSeo(slug);

  if (!product) {
    return buildPageMetadata({
      title: 'Product not found',
      description: 'This product is no longer available at Undaunted Treasure Trove.',
      path: `/product/${slug}`,
      noindex: true,
    });
  }

  const title = product.seo_title || product.name;
  const description =
    plainText(product.seo_description, 160) ||
    plainText(product.short_description, 160) ||
    plainText(product.description, 160) ||
    `Shop ${product.name} at ${getSiteName()} — curated jewelry from Adenta, Ghana.`;

  const ogImage = pickBestImage(product);
  const noindex = product.status !== 'active';

  const tagKeywords = Array.isArray(product.tags) ? product.tags.filter(Boolean) : [];
  const baseKeywords = product.category?.name
    ? [product.category.name, product.name, 'jewelry Ghana']
    : [product.name, 'jewelry Ghana'];

  const meta = buildPageMetadata({
    title,
    description,
    path: `/product/${slug}`,
    ogImage,
    ogType: 'product',
    noindex,
    keywords: Array.from(new Set([...tagKeywords, ...baseKeywords])),
  });

  return meta;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
