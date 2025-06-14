import { GameImage } from '@/types/game';

interface PreloadOptions {
  priority?: 'high' | 'low';
  sizes?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

class ImagePreloader {
  private preloadedImages = new Map<string, HTMLImageElement>();
  private preloadQueue = new Set<string>();
  private maxCacheSize = 20; // Maximum number of preloaded images to keep in memory
  
  /**
   * Preload a single image with optional optimization
   */
  async preloadImage(url: string, options: PreloadOptions = {}): Promise<HTMLImageElement> {
    // Return from cache if already preloaded
    if (this.preloadedImages.has(url)) {
      return this.preloadedImages.get(url)!;
    }

    // Skip if already in queue
    if (this.preloadQueue.has(url)) {
      return this.waitForPreload(url);
    }

    this.preloadQueue.add(url);

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set up image attributes
      if (options.crossOrigin) {
        img.crossOrigin = options.crossOrigin;
      }
      
      // Add srcset for responsive images if it's an optimizable URL
      if (url.includes('unsplash.com')) {
        const optimizedUrl = this.optimizeImageUrl(url);
        img.srcset = `
          ${optimizedUrl}&w=600 600w,
          ${optimizedUrl}&w=900 900w,
          ${optimizedUrl}&w=1200 1200w
        `;
        img.sizes = options.sizes || "(max-width: 768px) 600px, (max-width: 1024px) 900px, 1200px";
      }

      img.onload = () => {
        this.preloadQueue.delete(url);
        this.addToCache(url, img);
        resolve(img);
      };

      img.onerror = () => {
        this.preloadQueue.delete(url);
        reject(new Error(`Failed to preload image: ${url}`));
      };

      // Set loading priority
      if ('loading' in img) {
        (img as any).loading = options.priority === 'high' ? 'eager' : 'lazy';
      }

      img.src = url.includes('unsplash.com') ? this.optimizeImageUrl(url) : url;
    });
  }

  /**
   * Preload multiple images in batches
   */
  async preloadImages(urls: string[], batchSize: number = 3): Promise<void> {
    const batches = this.createBatches(urls, batchSize);
    
    for (const batch of batches) {
      try {
        await Promise.allSettled(
          batch.map(url => this.preloadImage(url, { priority: 'low' }))
        );
        
        // Small delay between batches to prevent overwhelming the browser
        await this.delay(100);
      } catch (error) {
        console.warn('Batch preloading error:', error);
      }
    }
  }

  /**
   * Preload game images intelligently
   */
  async preloadGameImages(images: GameImage[], currentIndex: number = 0): Promise<void> {
    if (!images || images.length === 0) return;

    // Preload current image with high priority
    if (images[currentIndex]) {
      try {
        await this.preloadImage(images[currentIndex].image_url, { priority: 'high' });
      } catch (error) {
        console.warn('Failed to preload current image:', error);
      }
    }

    // Preload next 2-3 images with lower priority in background
    const nextImages = images.slice(currentIndex + 1, currentIndex + 4);
    const nextUrls = nextImages.map(img => img.image_url);
    
    // Use setTimeout to make this non-blocking
    setTimeout(() => {
      this.preloadImages(nextUrls, 2);
    }, 100);
  }

  /**
   * Get preloaded image from cache
   */
  getPreloadedImage(url: string): HTMLImageElement | null {
    return this.preloadedImages.get(url) || null;
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.preloadedImages.clear();
    this.preloadQueue.clear();
  }

  /**
   * Remove specific image from cache
   */
  removeFromCache(url: string): void {
    this.preloadedImages.delete(url);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedImages: this.preloadedImages.size,
      queuedImages: this.preloadQueue.size,
      maxCacheSize: this.maxCacheSize
    };
  }

  // Private methods

  private optimizeImageUrl(url: string): string {
    if (!url.includes('unsplash.com')) return url;
    
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('w', '1200');
      urlObj.searchParams.set('h', '800');
      urlObj.searchParams.set('fit', 'crop');
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('q', '80');
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private addToCache(url: string, img: HTMLImageElement): void {
    // Remove oldest entries if cache is full
    if (this.preloadedImages.size >= this.maxCacheSize) {
      const firstKey = this.preloadedImages.keys().next().value;
      if (firstKey) {
        this.preloadedImages.delete(firstKey);
      }
    }
    
    this.preloadedImages.set(url, img);
  }

  private async waitForPreload(url: string): Promise<HTMLImageElement> {
    // Poll until image is preloaded or timeout
    const maxAttempts = 50; // 5 seconds max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (this.preloadedImages.has(url)) {
        return this.preloadedImages.get(url)!;
      }
      
      await this.delay(100);
      attempts++;
    }
    
    throw new Error(`Timeout waiting for image preload: ${url}`);
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const imagePreloader = new ImagePreloader();

// Utility functions
export const preloadGameImage = (url: string, priority: 'high' | 'low' = 'low') => {
  return imagePreloader.preloadImage(url, { priority });
};

export const preloadNextGameImages = (images: GameImage[], currentIndex: number) => {
  return imagePreloader.preloadGameImages(images, currentIndex);
};

export const clearImageCache = () => {
  imagePreloader.clearCache();
}; 