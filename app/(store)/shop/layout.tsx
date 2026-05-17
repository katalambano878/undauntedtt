import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Shop all jewelry',
  description:
    'Browse the full Undaunted Treasure Trove collection — necklaces, bracelets, earrings, rings, anklets, body chains and accessories. Wholesale and retail with nationwide delivery across Ghana.',
  path: '/shop',
  keywords: [
    'shop jewelry online Ghana',
    'jewelry store Adenta',
    'necklaces',
    'bracelets',
    'earrings',
    'rings',
    'anklets',
    'tennis bracelet Ghana',
    'titanium studs Ghana',
  ],
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
