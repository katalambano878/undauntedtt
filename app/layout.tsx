import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import {
  getSiteName,
  getSiteTagline,
  getDefaultMetaDescription,
  getDefaultTitleSuffix,
  getContactEmail,
  getContactAddress,
  getContactPhoneTel,
  getDefaultSocialLinks,
  getSocialInstagramHandle,
  getSocialTiktokHandle,
} from "@/lib/site-defaults";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://undauntedtt.com').replace(/\/$/, '');
const siteName = getSiteName();
const titleSuffix = getDefaultTitleSuffix();
const metaDesc = getDefaultMetaDescription();

// Brand palette — keep in sync with tailwind.config.js `brand.*` and
// public/manifest.json. Bronze is the URL-bar tint on Android/iOS.
const THEME_LIGHT = '#8e623b'; // brand.bronze (URL bar tint, light)
const THEME_DARK = '#5e3f1f';  // darker bronze (URL bar tint, dark)
const TILE_COLOR = '#8e623b';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: THEME_DARK },
  ],
  colorScheme: 'light dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: titleSuffix,
    template: `%s | ${siteName}`,
  },
  description: metaDesc,
  keywords: [
    siteName,
    'Undaunted Treasure Trove',
    'Undaunted TT',
    'jewelry Ghana',
    'jewelry Adenta',
    'necklaces Ghana',
    'bracelets Ghana',
    'earrings Ghana',
    'rings Ghana',
    'anklets Ghana',
    'waist beads Ghana',
    'titanium studs',
    'tennis bracelet',
    'tungsten rings',
    'jewelry online Accra',
    'jewelry wholesale Ghana',
    'jewelry retail Ghana',
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  applicationName: siteName,
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/apple-touch-icon.png', color: TILE_COLOR },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteName,
    startupImage: ['/icon-512.png'],
  },
  formatDetection: {
    telephone: true,
    email: false,
    address: false,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION }
      : undefined,
  },
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    alternateLocale: ['en_US', 'en_GB'],
    url: siteUrl,
    title: titleSuffix,
    description: metaDesc,
    siteName,
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        secureUrl: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${siteName} — ${getSiteTagline()}`,
        type: 'image/png',
      },
      {
        url: `${siteUrl}/og-image-square.png`,
        secureUrl: `${siteUrl}/og-image-square.png`,
        width: 1200,
        height: 1200,
        alt: `${siteName} brand mark`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: titleSuffix,
    description: metaDesc,
    images: [`${siteUrl}/og-image.png`],
    creator: `@${getSocialInstagramHandle()}`,
    site: `@${getSocialInstagramHandle()}`,
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      'en-GH': siteUrl,
      'x-default': siteUrl,
    },
  },
  category: 'shopping',
  classification: 'E-commerce, Jewelry, Fashion',
  other: {
    'msapplication-TileColor': TILE_COLOR,
    'msapplication-TileImage': '/icon-192.png',
    'msapplication-config': '/browserconfig.xml',
    'application-name': siteName,
    'apple-mobile-web-app-title': siteName,
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    // Geo metadata — improves local-pack visibility for Ghana / Adenta searches.
    'geo.region': process.env.NEXT_PUBLIC_GEO_REGION || 'GH-AA',
    'geo.placename': process.env.NEXT_PUBLIC_GEO_PLACENAME || 'Adenta, Greater Accra, Ghana',
    'geo.position': process.env.NEXT_PUBLIC_GEO_POSITION || '5.7081;-0.1683',
    ICBM: process.env.NEXT_PUBLIC_GEO_ICBM || '5.7081, -0.1683',
  },
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

function buildOrganizationJsonLd() {
  const social = getDefaultSocialLinks();
  const sameAs = [
    social.instagram,
    social.tiktok,
    social.snapchat,
    social.facebook,
    social.twitter,
    social.youtube,
  ].filter((u): u is string => !!u);

  const tel = getContactPhoneTel();
  const email = getContactEmail();
  const addr = getContactAddress();
  const country = (process.env.NEXT_PUBLIC_ADDRESS_COUNTRY || 'GH').trim();

  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: siteName,
    alternateName: ['Undaunted TT', 'Undaunted'],
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/logo.png`,
      width: 596,
      height: 419,
    },
    image: `${siteUrl}/og-image.png`,
    description: metaDesc,
    foundingDate: '2024',
    knowsAbout: [
      'Jewelry',
      'Necklaces',
      'Bracelets',
      'Earrings',
      'Rings',
      'Anklets',
      'Body chains',
      'Accessories',
    ],
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      ...(tel ? { telephone: tel } : {}),
      email,
      availableLanguage: ['English'],
      areaServed: country,
    },
  };

  if (addr) {
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: addr,
      addressLocality: process.env.NEXT_PUBLIC_ADDRESS_LOCALITY || 'Adenta',
      addressRegion: process.env.NEXT_PUBLIC_ADDRESS_REGION || 'Greater Accra',
      addressCountry: country,
    };
  }
  if (tel) org.telephone = tel;
  if (email) org.email = email;

  return org;
}

function buildLocalBusinessJsonLd() {
  const tel = getContactPhoneTel();
  const addr = getContactAddress();
  const social = getDefaultSocialLinks();
  const sameAs = [social.instagram, social.tiktok, social.snapchat, social.facebook, social.twitter, social.youtube].filter(
    (u): u is string => !!u,
  );
  const country = (process.env.NEXT_PUBLIC_ADDRESS_COUNTRY || 'GH').trim();
  const lat = process.env.NEXT_PUBLIC_GEO_LAT || '5.7081';
  const lng = process.env.NEXT_PUBLIC_GEO_LNG || '-0.1683';

  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': `${siteUrl}/#localbusiness`,
    name: siteName,
    image: `${siteUrl}/og-image.png`,
    logo: `${siteUrl}/logo.png`,
    url: siteUrl,
    description: metaDesc,
    priceRange: '₵',
    currenciesAccepted: process.env.NEXT_PUBLIC_CURRENCY || 'GHS',
    paymentAccepted: 'Mobile Money, Cash, Bank Transfer',
    ...(tel ? { telephone: tel } : {}),
    email: getContactEmail(),
    address: addr
      ? {
          '@type': 'PostalAddress',
          streetAddress: addr,
          addressLocality: process.env.NEXT_PUBLIC_ADDRESS_LOCALITY || 'Adenta',
          addressRegion: process.env.NEXT_PUBLIC_ADDRESS_REGION || 'Greater Accra',
          addressCountry: country,
        }
      : undefined,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: lat,
      longitude: lng,
    },
    areaServed: [
      { '@type': 'Country', name: 'Ghana' },
      { '@type': 'AdministrativeArea', name: 'Greater Accra' },
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '20:00',
      },
    ],
    sameAs,
  };
}

function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: siteName,
    alternateName: getSocialTiktokHandle(),
    url: siteUrl,
    description: metaDesc,
    inLanguage: 'en-GH',
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/shop?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    ],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgJsonLd = JSON.stringify(buildOrganizationJsonLd());
  const localJsonLd = JSON.stringify(buildLocalBusinessJsonLd());
  const siteJsonLd = JSON.stringify(buildWebsiteJsonLd());

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="mask-icon" href="/apple-touch-icon.png" color={TILE_COLOR} />

        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@4.1.0/fonts/remixicon.css"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: fonts loaded in root layout apply to all pages */}
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: orgJsonLd }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: localJsonLd }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteJsonLd }}
        />
      </head>

      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}

      {RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      )}

      <body className="antialiased font-sans overflow-x-hidden pwa-body bg-brand-cream text-brand-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000] focus:px-6 focus:py-3 focus:bg-brand-bronze focus:text-brand-cream focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <CartProvider>
          <WishlistProvider>
            <div id="main-content">
              {children}
            </div>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
