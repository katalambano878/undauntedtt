import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Jewelry categories',
  description:
    'Explore curated jewelry by category — Undaunted Originals, necklaces, bracelets, earrings, rings, bangles, anklets, chains, accessories and jewelry storage.',
  path: '/categories',
  keywords: [
    'jewelry categories',
    'undaunted originals',
    'waist chains Ghana',
    'bangles Ghana',
    'jewelry collections',
  ],
});

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
