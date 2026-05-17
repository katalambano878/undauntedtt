import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Blog & jewelry stories',
  description:
    'Style guides, jewelry care tips, customer stories and behind-the-scenes from Undaunted Treasure Trove.',
  path: '/blog',
  keywords: ['jewelry blog Ghana', 'jewelry styling tips', 'jewelry care guide'],
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
