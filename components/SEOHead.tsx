import { Metadata } from 'next';
import {
  getSiteName,
  getSiteTagline,
  getDefaultMetaDescription,
  getDefaultTitleSuffix,
  getContactPhoneTel,
} from '@/lib/site-defaults';

const SITE_BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://undauntedtt.com').replace(/\/$/, '');

function absoluteUrl(input?: string | null): string {
  if (!input) return SITE_BASE;
  if (/^https?:\/\//i.test(input)) return input;
  return `${SITE_BASE}${input.startsWith('/') ? input : `/${input}`}`;
}

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'product' | 'article';
  price?: number;
  currency?: string;
  availability?: string;
  category?: string;
  publishedTime?: string;
  author?: string;
  noindex?: boolean;
}

/**
 * Legacy helper kept for routes that still call it directly. New code should
 * prefer `buildPageMetadata` from `lib/seo.ts` (it composes cleanly with the
 * defaults declared in `app/layout.tsx`).
 */
export function generateMetadata({
  title,
  description,
  keywords = [],
  ogImage,
  ogType = 'website',
  publishedTime,
  author,
  noindex = false,
}: SEOProps): Metadata {
  const resolvedOgImage = absoluteUrl(ogImage || '/og-image.png');
  const siteName = getSiteName();
  const resolvedTitle = title ?? getDefaultTitleSuffix();
  const resolvedDesc = description ?? getDefaultMetaDescription();
  const fullTitle = resolvedTitle.includes(siteName) ? resolvedTitle : `${resolvedTitle} | ${siteName}`;

  const defaultKeywords = [siteName, getSiteTagline(), 'jewelry Ghana', 'jewelry Adenta', 'shopping'];
  const allKeywords = [...new Set([...keywords, ...defaultKeywords])];

  const metadata: Metadata = {
    title: fullTitle,
    description: resolvedDesc,
    keywords: allKeywords.join(', '),
    authors: author ? [{ name: author }] : undefined,
    openGraph: {
      title: fullTitle,
      description: resolvedDesc,
      images: [{ url: resolvedOgImage, width: 1200, height: 630, alt: resolvedTitle }],
      type: ogType as any,
      siteName,
      locale: 'en_GH',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: resolvedDesc,
      images: [resolvedOgImage],
    },
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    alternates: {
      canonical: SITE_BASE,
    },
  };

  if (ogType === 'article' && publishedTime) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      publishedTime,
    };
  }

  return metadata;
}

interface ProductSchemaInput {
  name: string;
  description: string;
  image: string | string[];
  price: number;
  currency?: string;
  sku: string;
  /** Absolute or root-relative URL for this product. Falls back to site root. */
  url?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  brand?: string;
  category?: string;
}

export function generateProductSchema(product: ProductSchemaInput) {
  const images = (Array.isArray(product.image) ? product.image : [product.image])
    .filter(Boolean)
    .map(absoluteUrl);
  const productUrl = absoluteUrl(product.url);
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: images.length > 1 ? images : images[0] || `${SITE_BASE}/og-image.png`,
    sku: product.sku,
    mpn: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand || getSiteName(),
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: product.price,
      priceCurrency: product.currency || 'GHS',
      availability:
        product.availability === 'in_stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: validUntil,
      seller: {
        '@type': 'Organization',
        name: getSiteName(),
      },
    },
  };

  if (product.rating && product.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (product.category) {
    schema.category = product.category;
  }

  return schema;
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function generateOrganizationSchema() {
  const tel = getContactPhoneTel();
  const cp: Record<string, unknown> = {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    availableLanguage: ['English'],
  };
  if (tel) cp.telephone = tel;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: getSiteName(),
    url: SITE_BASE,
    logo: `${SITE_BASE}/logo.png`,
    image: `${SITE_BASE}/og-image.png`,
    contactPoint: cp,
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: getSiteName(),
    url: SITE_BASE,
    inLanguage: 'en-GH',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_BASE}/shop?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateArticleSchema(article: {
  headline: string;
  description?: string;
  image?: string;
  url?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description || getDefaultMetaDescription(),
    image: absoluteUrl(article.image || '/og-image.png'),
    url: absoluteUrl(article.url),
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': article.author ? 'Person' : 'Organization',
      name: article.author || getSiteName(),
    },
    publisher: {
      '@type': 'Organization',
      name: getSiteName(),
      logo: { '@type': 'ImageObject', url: `${SITE_BASE}/logo.png` },
    },
    articleSection: article.category,
    inLanguage: 'en-GH',
  };
}

export function StructuredData({ data }: { data: any }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
