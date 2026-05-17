import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Sign in or sign up',
  description: 'Access your Undaunted Treasure Trove account.',
  path: '/auth',
  noindex: true,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
