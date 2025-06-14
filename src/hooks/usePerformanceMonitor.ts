import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  imageLoadTime: number;
  totalLoadTime: number;
  componentMountTime: number;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  entryType: string;
}

// Extend Performance interface for memory API
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
  memory?: MemoryInfo;
}

export const usePerformanceMonitor = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    imageLoadTime: 0,
    totalLoadTime: 0,
    componentMountTime: 0
  });

  const mountTime = useRef<number>(0);
  const renderStartTime = useRef<number>(0);

  // Track component mount time
  useEffect(() => {
    const startTime = performance.now();
    mountTime.current = startTime;

    return () => {
      const endTime = performance.now();
      const mountDuration = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        componentMountTime: mountDuration
      }));

      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Performance metrics for ${componentName}:`, {
          mountTime: mountDuration.toFixed(2) + 'ms',
          memoryUsage: getMemoryUsage(),
        });
      }
    };
  }, [componentName]);

  // Track render performance
  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setMetrics(prev => ({
      ...prev,
      renderTime
    }));
  }, []);

  // Monitor image loading performance
  const trackImageLoad = (imageUrl: string) => {
    const startTime = performance.now();
    
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const loadTime = performance.now() - startTime;
        setMetrics(prev => ({
          ...prev,
          imageLoadTime: loadTime
        }));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🖼️ Image loaded in ${loadTime.toFixed(2)}ms:`, imageUrl.substring(0, 50));
        }
        
        resolve();
      };
      
      img.onerror = () => {
        const loadTime = performance.now() - startTime;
        console.warn(`❌ Image failed to load after ${loadTime.toFixed(2)}ms:`, imageUrl.substring(0, 50));
        reject();
      };
      
      img.src = imageUrl;
    });
  };

  // Monitor navigation performance
  const trackNavigation = () => {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
      if (navigationEntry) {
        const totalTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
        setMetrics(prev => ({
          ...prev,
          totalLoadTime: totalTime
        }));
      }
    } catch (error) {
      console.warn('Could not get navigation timing:', error);
    }
  };

  // Get memory usage if available
  const getMemoryUsage = () => {
    try {
      const extendedPerformance = performance as ExtendedPerformance;
      if (extendedPerformance.memory) {
        const memory = extendedPerformance.memory;
        return {
          used: Math.round(memory.usedJSHeapSize / 1048576), // MB
          total: Math.round(memory.totalJSHeapSize / 1048576), // MB
          limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        };
      }
    } catch (error) {
      // Memory API not available
    }
    return undefined;
  };

  // Monitor Core Web Vitals
  const measureWebVitals = () => {
    try {
      // Largest Contentful Paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚡ FID: ${entry.processingStart - entry.startTime}ms`);
          }
        });
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });

    } catch (error) {
      console.warn('Web Vitals monitoring not available:', error);
    }
  };

  // Start monitoring on mount
  useEffect(() => {
    trackNavigation();
    measureWebVitals();
  }, []);

  return {
    metrics,
    trackImageLoad,
    getMemoryUsage,
    trackNavigation,
  };
};

// Hook for debouncing expensive operations
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttling high-frequency events
export const useThrottle = <T>(value: T, delay: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + delay) {
      setThrottledValue(value);
      lastExecuted.current = Date.now();
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, delay - (Date.now() - lastExecuted.current));

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
}; 