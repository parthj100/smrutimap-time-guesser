import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GAME_CONSTANTS } from '@/constants/gameConstants';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError,
  style,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate responsive image URLs
  const generateResponsiveUrls = useCallback((originalSrc: string) => {
    if (!originalSrc.includes('unsplash.com') && !originalSrc.includes('images.')) {
      return { webp: originalSrc, fallback: originalSrc, srcSet: '' };
    }

    const breakpoints = GAME_CONSTANTS.IMAGE_QUALITY.RESPONSIVE_BREAKPOINTS;
    const quality = GAME_CONSTANTS.IMAGE_QUALITY.COMPRESSION;

    // Generate srcset for different screen sizes
    const srcSetEntries = [
      `${optimizeImageUrl(originalSrc, breakpoints.SMALL, quality)} ${breakpoints.SMALL}w`,
      `${optimizeImageUrl(originalSrc, breakpoints.MEDIUM, quality)} ${breakpoints.MEDIUM}w`,
      `${optimizeImageUrl(originalSrc, breakpoints.LARGE, quality)} ${breakpoints.LARGE}w`,
    ];

    // Try to generate WebP version
    const webpSrc = generateWebPUrl(originalSrc, quality);
    const fallbackSrc = optimizeImageUrl(originalSrc, breakpoints.LARGE, quality);

    return {
      webp: webpSrc,
      fallback: fallbackSrc,
      srcSet: srcSetEntries.join(', '),
    };
  }, []);

  // Optimize image URL with parameters
  const optimizeImageUrl = (url: string, width: number, quality: number): string => {
    try {
      const urlObj = new URL(url);
      
      if (url.includes('unsplash.com')) {
        urlObj.searchParams.set('w', width.toString());
        urlObj.searchParams.set('q', quality.toString());
        urlObj.searchParams.set('auto', 'format');
        urlObj.searchParams.set('fit', 'crop');
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  // Generate WebP URL
  const generateWebPUrl = (url: string, quality: number): string => {
    try {
      const urlObj = new URL(url);
      
      if (url.includes('unsplash.com')) {
        urlObj.searchParams.set('fm', 'webp');
        urlObj.searchParams.set('q', quality.toString());
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  // Generate low-quality placeholder
  const generatePlaceholder = useCallback((originalSrc: string): string => {
    if (blurDataURL) return blurDataURL;
    
    try {
      const urlObj = new URL(originalSrc);
      
      if (originalSrc.includes('unsplash.com')) {
        urlObj.searchParams.set('w', '20');
        urlObj.searchParams.set('q', '10');
        urlObj.searchParams.set('blur', '10');
        return urlObj.toString();
      }
    } catch {
      // Return a simple data URL placeholder
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjNmNGY2Ii8+Cjwvc3ZnPgo=';
    }
    
    return '';
  }, [blurDataURL]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  // Handle image loading
  useEffect(() => {
    if (!isInView || !src) return;

    const { webp, fallback, srcSet } = generateResponsiveUrls(src);
    
    // Try to load WebP first, fallback to original format
    const img = new Image();
    
    img.onload = () => {
      setCurrentSrc(img.src);
      setIsLoaded(true);
      setHasError(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      // If WebP fails, try the fallback
      if (img.src === webp && webp !== fallback) {
        img.src = fallback;
        return;
      }
      
      setHasError(true);
      onError?.();
    };

    // Start with WebP if supported, otherwise use fallback
    const supportsWebP = checkWebPSupport();
    img.src = supportsWebP ? webp : fallback;
    
    if (srcSet) {
      img.srcset = srcSet;
      img.sizes = sizes;
    }

  }, [isInView, src, generateResponsiveUrls, sizes, onLoad, onError]);

  // Check WebP support
  const checkWebPSupport = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // Handle image load event
  const handleImageLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error event
  const handleImageError = () => {
    setHasError(true);
    onError?.();
  };

  const placeholderSrc = generatePlaceholder(src);
  const { srcSet } = generateResponsiveUrls(src);

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Low-quality placeholder */}
      {placeholder === 'blur' && placeholderSrc && !isLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
          style={{ opacity: isLoaded ? 0 : 1 }}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={currentSrc || src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!isLoaded && !hasError && isInView && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea384c]"></div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage; 