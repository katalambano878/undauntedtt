import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Shipping & delivery',
  description:
    'Shipping rates, delivery times and pickup options for Undaunted Treasure Trove orders. Nationwide delivery across Ghana from our Adenta base.',
  path: '/shipping',
});

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
