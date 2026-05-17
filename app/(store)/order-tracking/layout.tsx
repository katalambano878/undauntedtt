import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Track your order',
  description:
    'Look up the live status of your Undaunted Treasure Trove order. Enter your order number and email or phone to see updates.',
  path: '/order-tracking',
});

export default function OrderTrackingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
