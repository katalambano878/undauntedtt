import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact',
  description:
    'Talk to Undaunted Treasure Trove. Call or WhatsApp 0550244386, message us on Instagram (@undaunted_tt) or TikTok, or send a message — we’re based in Adenta, Greater Accra, Ghana.',
  path: '/contact',
  keywords: ['contact Undaunted Treasure Trove', 'jewelry shop Adenta contact', 'WhatsApp jewelry Ghana'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
