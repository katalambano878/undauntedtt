import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Frequently asked questions',
  description:
    'Answers to common questions about jewelry care, sizing, shipping, returns, payment and wholesale orders at Undaunted Treasure Trove.',
  path: '/faqs',
  keywords: ['jewelry care', 'jewelry sizing', 'returns Ghana', 'wholesale jewelry FAQ'],
});

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
