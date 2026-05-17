import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Returns & exchanges',
  description:
    'Our returns and exchange policy. How to request a return, the timeline, and what items are eligible — Undaunted Treasure Trove, Adenta, Ghana.',
  path: '/returns',
});

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
