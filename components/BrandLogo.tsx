import Image from 'next/image';
import { getSiteName, getWordmark } from '@/lib/site-defaults';

interface BrandLogoProps {
  /** Pixel height of the rendered logo. Width auto-scales to preserve aspect ratio. */
  height?: number;
  /** Optional class names to fine-tune size / colour / spacing. */
  className?: string;
  /** Use the high-priority loader (set on the above-the-fold header logo). */
  priority?: boolean;
  /** Override the alt text. Falls back to "<site name> logo". */
  alt?: string;
}

/**
 * The Undaunted Treasure Trove brand mark — the gold ornate "UT" monogram with
 * the UNDAUNTEDTT wordmark. Backed by `/public/logo.png` (735 × 520, transparent
 * background) so it sits cleanly on light or dark surfaces.
 *
 * Use this anywhere the brand needs to be shown: header, footer, PWA splash,
 * install prompt, admin sidebar, admin login, etc.
 */
export default function BrandLogo({
  height = 40,
  className = '',
  priority = false,
  alt,
}: BrandLogoProps) {
  const siteName = getSiteName();
  const wordmark = getWordmark();
  const aspectRatio = 735 / 520;
  const width = Math.round(height * aspectRatio);
  return (
    <Image
      src="/logo.png"
      alt={alt || `${siteName} logo`}
      width={width}
      height={height}
      priority={priority}
      sizes={`${width}px`}
      className={`select-none ${className}`}
      style={{ height, width: 'auto' }}
      // Hidden text fallback for screen readers / when images fail to load
      data-wordmark={wordmark}
    />
  );
}
