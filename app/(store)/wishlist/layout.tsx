import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Wishlist',
  description: 'Pieces you have saved for later at Undaunted Treasure Trove.',
  path: '/wishlist',
  noindex: true,
});

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
