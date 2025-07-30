// Image optimization utilities
export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ResponsiveImageSizes {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

// Default responsive breakpoints
const DEFAULT_SIZES: ResponsiveImageSizes = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Default optimization options
const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  quality: 85,
  format: 'webp',
  fit: 'cover',
};

/**
 * Optimize image URL for different services
 */
export function optimizeImageUrl(
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Handle Unsplash images
  if (originalUrl.includes('unsplash.com')) {
    return optimizeUnsplashUrl(originalUrl, opts);
  }

  // Handle other image services
  if (originalUrl.includes('images.')) {
    return optimizeGenericImageUrl(originalUrl, opts);
  }

  // Return original URL if no optimization available
  return originalUrl;
}

/**
 * Optimize Unsplash URLs
 */
function optimizeUnsplashUrl(
  url: string,
  options: ImageOptimizationOptions
): string {
  const urlObj = new URL(url);
  
  // Set width if provided
  if (options.width) {
    urlObj.searchParams.set('w', options.width.toString());
  }
  
  // Set height if provided
  if (options.height) {
    urlObj.searchParams.set('h', options.height.toString());
  }
  
  // Set quality
  urlObj.searchParams.set('q', options.quality!.toString());
  
  // Set fit mode
  urlObj.searchParams.set('fit', options.fit!);
  
  // Enable auto format optimization
  urlObj.searchParams.set('auto', 'format');
  
  // Enable compression
  urlObj.searchParams.set('fm', options.format!);
  
  return urlObj.toString();
}

/**
 * Optimize generic image URLs
 */
function optimizeGenericImageUrl(
  url: string,
  options: ImageOptimizationOptions
): string {
  // Add optimization parameters if supported
  const urlObj = new URL(url);
  
  if (options.width) {
    urlObj.searchParams.set('width', options.width.toString());
  }
  
  if (options.height) {
    urlObj.searchParams.set('height', options.height.toString());
  }
  
  if (options.quality) {
    urlObj.searchParams.set('quality', options.quality.toString());
  }
  
  return urlObj.toString();
}

/**
 * Generate responsive image srcset
 */
export function generateSrcSet(
  originalUrl: string,
  sizes: ResponsiveImageSizes = DEFAULT_SIZES,
  options: ImageOptimizationOptions = {}
): string {
  const srcSetEntries = Object.entries(sizes).map(([breakpoint, width]) => {
    const optimizedUrl = optimizeImageUrl(originalUrl, {
      ...options,
      width,
    });
    return `${optimizedUrl} ${width}w`;
  });

  return srcSetEntries.join(', ');
}

/**
 * Generate responsive image sizes attribute
 */
export function generateSizes(
  sizes: ResponsiveImageSizes = DEFAULT_SIZES
): string {
  return `(max-width: ${sizes.sm}px) ${sizes.sm}px, (max-width: ${sizes.md}px) ${sizes.md}px, (max-width: ${sizes.lg}px) ${sizes.lg}px, ${sizes.xl}px`;
}

/**
 * Preload image for better performance
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(url => preloadImage(url));
  await Promise.allSettled(promises);
}

/**
 * Generate low-quality placeholder URL
 */
export function generatePlaceholderUrl(
  originalUrl: string,
  width: number = 20,
  height: number = 20
): string {
  return optimizeImageUrl(originalUrl, {
    width,
    height,
    quality: 10,
    format: 'jpeg',
  });
}

/**
 * Check if WebP is supported
 */
export function isWebPSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(): 'webp' | 'jpeg' {
  return isWebPSupported() ? 'webp' : 'jpeg';
}

/**
 * Calculate optimal image dimensions based on container
 */
export function calculateOptimalDimensions(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 16 / 9
): { width: number; height: number } {
  const containerAspectRatio = containerWidth / containerHeight;
  
  if (containerAspectRatio > aspectRatio) {
    // Container is wider than image aspect ratio
    return {
      width: Math.round(containerHeight * aspectRatio),
      height: containerHeight,
    };
  } else {
    // Container is taller than image aspect ratio
    return {
      width: containerWidth,
      height: Math.round(containerWidth / aspectRatio),
    };
  }
}

/**
 * Generate progressive image loading URLs
 */
export function generateProgressiveUrls(
  originalUrl: string,
  qualitySteps: number[] = [10, 30, 60, 85]
): string[] {
  return qualitySteps.map(quality =>
    optimizeImageUrl(originalUrl, { quality })
  );
}

/**
 * Debounce image loading to prevent excessive requests
 */
export function debounceImageLoad<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle image loading for performance
 */
export function throttleImageLoad<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Image loading performance metrics
 */
export interface ImageLoadMetrics {
  startTime: number;
  loadTime: number;
  size: number;
  url: string;
}

/**
 * Track image loading performance
 */
export function trackImageLoad(url: string): Promise<ImageLoadMetrics> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const img = new Image();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      
      // Try to get image size (may not be available due to CORS)
      let size = 0;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          size = canvas.toDataURL().length;
        }
      } catch (error) {
        // CORS error, size unavailable
      }
      
      resolve({
        startTime,
        loadTime,
        size,
        url,
      });
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    img.src = url;
  });
} 