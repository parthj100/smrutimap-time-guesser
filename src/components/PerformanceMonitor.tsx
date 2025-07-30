import React, { useEffect, useState } from 'react';
import { trackImageLoad } from '@/utils/imageOptimization';

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  imageLoadTimes: Array<{
    url: string;
    loadTime: number;
    size: number;
  }>;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showMetrics?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  showMetrics = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
    imageLoadTimes: [],
  });

  useEffect(() => {
    if (!enabled) return;

    const measurePerformance = () => {
      // Measure page load time
      const pageLoadTime = performance.now();

      // Measure Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                setMetrics(prev => ({ ...prev, firstContentfulPaint: entry.startTime }));
              }
              break;
            case 'largest-contentful-paint':
              setMetrics(prev => ({ ...prev, largestContentfulPaint: entry.startTime }));
              break;
            case 'layout-shift':
              setMetrics(prev => ({ 
                ...prev, 
                cumulativeLayoutShift: prev.cumulativeLayoutShift + (entry as any).value 
              }));
              break;
            case 'first-input':
              setMetrics(prev => ({ ...prev, firstInputDelay: (entry as any).processingStart - entry.startTime }));
              break;
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });

      // Update page load time
      setMetrics(prev => ({ ...prev, pageLoadTime }));

      // Log metrics to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Performance Metrics:', metrics);
      }

      return () => observer.disconnect();
    };

    // Measure performance after page load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
      return () => window.removeEventListener('load', measurePerformance);
    }
  }, [enabled]);

  // Track image loading performance
  const trackImagePerformance = async (imageUrl: string) => {
    if (!enabled) return;

    try {
      const imageMetrics = await trackImageLoad(imageUrl);
      setMetrics(prev => ({
        ...prev,
        imageLoadTimes: [...prev.imageLoadTimes, {
          url: imageUrl,
          loadTime: imageMetrics.loadTime,
          size: imageMetrics.size,
        }],
      }));
    } catch (error) {
      console.warn('Failed to track image performance:', error);
    }
  };

  // Expose tracking function globally for other components
  useEffect(() => {
    if (enabled && typeof window !== 'undefined') {
      (window as any).trackImagePerformance = trackImagePerformance;
    }
  }, [enabled]);

  if (!enabled || !showMetrics) {
    return null;
  }

  const getPerformanceScore = (): number => {
    let score = 100;

    // Deduct points for poor performance
    if (metrics.pageLoadTime > 3000) score -= 20;
    if (metrics.firstContentfulPaint > 1800) score -= 15;
    if (metrics.largestContentfulPaint > 2500) score -= 15;
    if (metrics.cumulativeLayoutShift > 0.1) score -= 10;
    if (metrics.firstInputDelay > 100) score -= 10;

    return Math.max(0, score);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="text-sm font-semibold mb-2">Performance Monitor</h3>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span>Performance Score:</span>
          <span className={`font-bold ${getScoreColor(getPerformanceScore())}`}>
            {getPerformanceScore()}/100
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Page Load:</span>
          <span>{metrics.pageLoadTime.toFixed(0)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span>First Paint:</span>
          <span>{metrics.firstContentfulPaint.toFixed(0)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span>Largest Paint:</span>
          <span>{metrics.largestContentfulPaint.toFixed(0)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span>Layout Shift:</span>
          <span>{metrics.cumulativeLayoutShift.toFixed(3)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Input Delay:</span>
          <span>{metrics.firstInputDelay.toFixed(0)}ms</span>
        </div>
        
        <div className="flex justify-between">
          <span>Images Loaded:</span>
          <span>{metrics.imageLoadTimes.length}</span>
        </div>
      </div>

      {metrics.imageLoadTimes.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs cursor-pointer">Image Load Times</summary>
          <div className="mt-1 space-y-1">
            {metrics.imageLoadTimes.slice(-5).map((img, index) => (
              <div key={index} className="text-xs">
                <div className="truncate">{img.url.split('/').pop()}</div>
                <div className="flex justify-between text-gray-500">
                  <span>{img.loadTime.toFixed(0)}ms</span>
                  <span>{img.size > 0 ? `${(img.size / 1024).toFixed(1)}KB` : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default PerformanceMonitor; 