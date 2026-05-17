import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'My account',
  description: 'Manage your Undaunted Treasure Trove orders, addresses and personal details.',
  path: '/account',
  noindex: true,
});

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
