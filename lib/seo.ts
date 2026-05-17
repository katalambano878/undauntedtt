import type { Metadata } from 'next';
import { getSiteName, getSiteTagline } from './site-defaults';

const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://undauntedtt.com').replace(/\/$/, '');

export interface PageSEOInput {
  /** Page title (will be templated to "Title | Site name" by the root layout). */
  title: string;
  /** Meta description (50–160 chars recommended). */
  description: string;
  /** Path on this site, e.g. `/shop`. Becomes the canonical URL. */
  path: string;
  /** Optional extra keywords to append to the site defaults. */
  keywords?: string[];
  /** Override the OG image (must be absolute or root-relative). */
  ogImage?: string;
  /** Override the OG type (defaults to website). */
  ogType?: 'website' | 'article' | 'product';
  /** Mark the page as noindex (cart, checkout, account, etc.). */
  noindex?: boolean;
}

/**
 * Build a `Metadata` object for a page, layered on top of the site defaults
 * declared in `app/layout.tsx`. Use from a server component (page.tsx or
 * layout.tsx) that wraps a client page.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  ogImage,
  ogType = 'website',
  noindex = false,
}: PageSEOInput): Metadata {
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const image = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : `${BASE}${ogImage.startsWith('/') ? ogImage : `/${ogImage}`}`
    : `${BASE}/og-image.png`;
  const siteName = getSiteName();
  const fullTitleForOg = `${title} | ${siteName}`;
  const altText = `${title} — ${siteName}`;

  // Next's OpenGraph type only accepts 'website' / 'article' / etc. — Product
  // pages use 'website' for the Next-generated tag and emit Product JSON-LD
  // separately to express the richer semantics.
  const ogTypeForNext: 'website' | 'article' = ogType === 'article' ? 'article' : 'website';

  const meta: Metadata = {
    title,
    description,
    keywords: keywords && keywords.length ? keywords : undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: ogTypeForNext,
      url,
      title: fullTitleForOg,
      description,
      siteName,
      locale: 'en_GH',
      images: [
        {
          url: image,
          secureUrl: image,
          width: 1200,
          height: 630,
          alt: altText,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitleForOg,
      description,
      images: [image],
    },
  };

  if (noindex) {
    meta.robots = {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    };
  }

  return meta;
}

export const seoBase = BASE;
export const seoSiteName = getSiteName;
export const seoSiteTagline = getSiteTagline;
