import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Maximize2, X } from 'lucide-react';

interface GameImageProps {
  imageUrl: string;
  description?: string;
  revealDescription?: boolean;
}

// Progressive image loading hook with retry functionality
const useProgressiveImage = (src: string) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const MAX_RETRY_ATTEMPTS = 3;

  const handleRetry = useCallback(() => {
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      setIsRetrying(true);
      setImageError(false);
      setRetryCount(prev => prev + 1);
      
      // Force reload with cache-busting parameter
      const retryUrl = `${src}?retry=${retryCount + 1}&t=${Date.now()}`;
      setCurrentSrc(retryUrl);
      
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        setImageError(false);
        setIsRetrying(false);
      };
      img.onerror = () => {
        setImageLoaded(false);
        setImageError(true);
        setIsRetrying(false);
      };
      img.src = retryUrl;
    }
  }, [src, retryCount]);

  useEffect(() => {
    if (!src) return;

    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
    setIsRetrying(false);

    const img = new Image();
    
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
      setCurrentSrc(src);
      setIsRetrying(false);
    };
    
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
      setIsRetrying(false);
    };
    
    img.src = src;
  }, [src]);

  return { 
    imageLoaded, 
    imageError, 
    currentSrc, 
    retryCount,
    isRetrying,
    canRetry: retryCount < MAX_RETRY_ATTEMPTS,
    handleRetry 
  };
};

// Intersection Observer hook for lazy loading
const useIntersectionObserver = (
  elementRef: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return isIntersecting;
};

const GameImage: React.FC<GameImageProps> = React.memo(({
  imageUrl,
  description = "",
  revealDescription = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(containerRef);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Only start loading image when component is visible
  const shouldLoadImage = isVisible;
  const { imageLoaded, imageError, currentSrc, retryCount, isRetrying, canRetry, handleRetry } = useProgressiveImage(
    shouldLoadImage ? imageUrl : ''
  );

  // Memoize the fallback URL to prevent unnecessary re-renders
  const fallbackUrl = useMemo(() => 
    'https://images.unsplash.com/photo-1517022812141-23620dba5c23?w=800&h=600&fit=crop', 
    []
  );

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== fallbackUrl) {
      target.src = fallbackUrl;
    }
  };

  // Generate optimized image URL with proper sizing
  const optimizedImageUrl = useMemo(() => {
    if (!imageUrl) return fallbackUrl;
    
    // If it's an Unsplash image, add optimization parameters for larger display
    if (imageUrl.includes('unsplash.com')) {
      const url = new URL(imageUrl);
      url.searchParams.set('w', '1600'); // Increased from 1200
      url.searchParams.set('h', '1200'); // Increased from 800
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('auto', 'format');
      url.searchParams.set('q', '85'); // Increased quality from 80
      return url.toString();
    }
    
    return imageUrl;
  }, [imageUrl, fallbackUrl]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden transition-all duration-300" style={{ maxHeight: '800px', minHeight: '400px' }}>
      {/* Loading skeleton */}
      {!imageLoaded && !imageError && shouldLoadImage && (
        <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse flex items-center justify-center transition-all duration-300" style={{ height: '500px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}>
          <div className="text-gray-500 animate-pulse">Loading image...</div>
        </div>
      )}
      
      {/* Placeholder when not in view */}
      {!shouldLoadImage && (
        <div className="w-full bg-gray-100 flex items-center justify-center transition-all duration-300" style={{ height: '500px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}>
          <div className="text-gray-400">Image will load when visible</div>
        </div>
      )}
      
      {/* Main image with dynamic container sizing - no white space */}
      {shouldLoadImage && (
        <div 
          className="relative w-full overflow-hidden transition-all duration-300"
          style={{
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            height: '500px' // Increased default height for bigger images
          }}
        >
          <img 
            src={currentSrc || optimizedImageUrl}
            alt="Historical image" 
            className={`w-full h-full transition-all duration-300 ${
              imageLoaded ? 'opacity-100 blur-0' : 'opacity-70 blur-sm'
            } ${imageLoaded ? 'block' : currentSrc ? 'block' : 'hidden'}`}
            onError={handleImageError}
            style={{ 
              objectFit: 'contain', // Preserve full image content
              objectPosition: 'center',
              borderRadius: '16px'
            }}
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              const aspectRatio = img.naturalWidth / img.naturalHeight;
              
              // Calculate optimal height based on container width and image aspect ratio
              const containerWidth = img.offsetWidth;
              let finalHeight = containerWidth / aspectRatio;
              
              // Increased height bounds for bigger images (400px to 800px to better match map)
              finalHeight = Math.max(400, Math.min(800, finalHeight));
              
              // For images that would create white space, adjust the container width instead
              let finalWidth = containerWidth;
              if (finalHeight === 400 || finalHeight === 800) {
                // Height was constrained, so adjust width to maintain aspect ratio
                finalWidth = finalHeight * aspectRatio;
              }
              
              // Calculate adaptive border radius (4% of height, min 8px, max 24px)
              const adaptiveBorderRadius = Math.max(8, Math.min(24, finalHeight * 0.04));
              
              // Calculate adaptive shadow (scales with height)
              const shadowIntensity = Math.max(0.1, Math.min(0.25, finalHeight / 2000));
              const shadowBlur = Math.max(8, Math.min(30, finalHeight * 0.06));
              const shadowOffset = Math.max(4, Math.min(15, finalHeight * 0.03));
              
              // Apply styling to the container to match image exactly
              const container = img.parentElement;
              if (container) {
                container.style.height = `${finalHeight}px`;
                container.style.width = `${finalWidth}px`;
                container.style.maxWidth = '100%'; // Don't exceed parent width
                container.style.margin = '0 auto'; // Center the container
                container.style.borderRadius = `${adaptiveBorderRadius}px`;
                container.style.boxShadow = `0 ${shadowOffset}px ${shadowBlur}px rgba(0, 0, 0, ${shadowIntensity})`;
              }
              
              // Apply border radius to image to match container
              img.style.borderRadius = `${adaptiveBorderRadius}px`;
              
              // Update outer container to match
              if (containerRef.current) {
                containerRef.current.style.height = `${finalHeight}px`;
              }
            }}
            // Add srcset for responsive images if it's an optimizable URL
            {...(optimizedImageUrl.includes('unsplash.com') && {
              srcSet: `
                ${optimizedImageUrl}&w=800 800w,
                ${optimizedImageUrl}&w=1200 1200w,
                ${optimizedImageUrl}&w=1600 1600w
              `,
              sizes: "(max-width: 768px) 800px, (max-width: 1024px) 1200px, 1600px"
            })}
          />
          
          {/* Fullscreen Button */}
          {imageLoaded && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm transition-all duration-200 hover:scale-110 z-10"
              title="View fullscreen"
            >
              <Maximize2 size={20} />
            </button>
          )}
        </div>
      )}
      
      {/* Enhanced description overlay */}
      {revealDescription && description && imageLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 text-white backdrop-blur-sm" style={{ borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}>
          <p className="text-sm leading-relaxed">{description}</p>
        </div>
      )}
      
      {/* Error state */}
      {imageError && (
        <div className="w-full bg-red-50 flex items-center justify-center border-2 border-red-200 transition-all duration-300" style={{ height: '500px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }}>
          <div className="text-center text-red-600 p-6">
            <div className="text-4xl mb-4">📷</div>
            <div className="text-xl font-semibold mb-2">Image Failed to Load</div>
            <div className="text-sm text-gray-600 mb-4">
              {retryCount > 0 ? `Attempted ${retryCount} time${retryCount > 1 ? 's' : ''}` : 'Connection issue or invalid image'}
            </div>
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 bg-[#ea384c] text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Retrying...
                  </span>
                ) : (
                  'Try Again'
                )}
              </button>
            )}
            {!canRetry && retryCount >= 3 && (
              <div className="text-sm text-gray-500 mt-2">
                Unable to load after multiple attempts. Please refresh the page.
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 z-10"
              title="Close fullscreen"
            >
              <X size={24} />
            </button>
            
            {/* Fullscreen Image */}
            <img 
              src={currentSrc || optimizedImageUrl}
              alt="Historical image (fullscreen)" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{ 
                maxWidth: '95vw',
                maxHeight: '95vh'
              }}
              onError={handleImageError}
            />
          </div>
        </div>
      )}
    </div>
  );
});

GameImage.displayName = 'GameImage';

export default GameImage;
