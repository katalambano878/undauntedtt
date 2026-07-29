'use client';

import { useState } from 'react';
import Image from 'next/image';
import { isStorageImageUrl, storageImageUrl } from '@/lib/storage-image';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  sizes?: string;
  /** Max pixel width to request from storage resizer (card ≈ 480, PDP ≈ 900). */
  imageWidth?: number;
  quality?: number;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  imageWidth = 480,
  quality = 70,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onLoad?.();
  };

  const baseSrc =
    !src || src.includes('via.placeholder.com')
      ? '/placeholder-product.svg'
      : src;

  const resolvedSrc = storageImageUrl(baseSrc, {
    width: imageWidth,
    quality,
  });

  const useNativeImg = isStorageImageUrl(baseSrc);

  if (!resolvedSrc || hasError) {
    return (
      <div className={`relative overflow-hidden bg-gray-200 flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-gray-400 text-xs">No Image</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse z-10"></div>
      )}
      {useNativeImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={sizes}
          className={`object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          quality={75}
        />
      )}
    </div>
  );
}
