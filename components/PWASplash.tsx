'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getWordmark, getSiteName } from '@/lib/site-defaults';

export default function PWASplash() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Only show splash in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Only show on first load (not on subsequent navigations)
    const hasShownSplash = sessionStorage.getItem('splashShown');

    if (isStandalone && !hasShownSplash) {
      setShowSplash(true);
      sessionStorage.setItem('splashShown', 'true');

      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showSplash) return null;

  return (
    <div className="pwa-splash" aria-hidden="true">
      <div className="pwa-splash-logo mb-6">
        <Image
          src="/logo.png"
          alt={getWordmark()}
          width={220}
          height={156}
          priority
          className="drop-shadow-2xl w-44 sm:w-56 h-auto"
        />
      </div>
      <h1 className="text-white text-lg font-medium font-sans mb-2 opacity-90">{getSiteName()}</h1>
      <p className="text-blue-200 text-sm font-medium mb-8">{process.env.NEXT_PUBLIC_SITE_TAGLINE || 'Curated jewelry from Adenta, Ghana'}</p>
      <div className="pwa-splash-dots flex gap-1.5">
        <span className="w-2 h-2 bg-white rounded-full" />
        <span className="w-2 h-2 bg-white rounded-full" />
        <span className="w-2 h-2 bg-white rounded-full" />
      </div>
    </div>
  );
}
