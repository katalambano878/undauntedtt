import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'About us',
  description:
    'Undaunted Treasure Trove is a curated jewelry brand based in Adenta, Greater Accra. We blend everyday and statement pieces — wholesale and retail, with nationwide delivery across Ghana.',
  path: '/about',
  keywords: ['about Undaunted', 'jewelry brand Ghana', 'Adenta jewelry store'],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
