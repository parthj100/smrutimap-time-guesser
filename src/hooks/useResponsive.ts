import { useState, useEffect, useCallback } from 'react';

// Breakpoint definitions
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

interface BreakpointState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

// Hook for responsive breakpoints
export const useBreakpoint = (): BreakpointState => {
  const [breakpoint, setBreakpoint] = useState<BreakpointState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setBreakpoint({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        width,
        height,
      });
    };

    // Initial check
    updateBreakpoint();

    // Listen for resize events
    window.addEventListener('resize', updateBreakpoint);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

// Hook for device detection
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouchDevice: false,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    userAgent: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Device type detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    // OS detection
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);

    // Browser detection
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);

    setDeviceInfo({
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isFirefox,
      userAgent,
    });
  }, []);

  return deviceInfo;
};

// Hook for orientation detection
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
};

// Hook for touch gestures
export const useTouchGestures = (
  element: React.RefObject<HTMLElement>,
  options: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onPinch?: (scale: number) => void;
    threshold?: number;
  } = {}
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    threshold = 50,
  } = options;

  useEffect(() => {
    if (!element.current) return;

    let startX = 0;
    let startY = 0;
    let startDistance = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      } else if (e.touches.length === 2 && onPinch) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        startDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && onPinch) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        const scale = currentDistance / startDistance;
        onPinch(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (Math.max(absDeltaX, absDeltaY) > threshold) {
          if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0) {
              onSwipeRight?.();
            } else {
              onSwipeLeft?.();
            }
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              onSwipeDown?.();
            } else {
              onSwipeUp?.();
            }
          }
        }
      }
    };

    const el = element.current;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinch, threshold]);
};

// Hook for viewport height (handles mobile browser address bar)
export const useViewportHeight = () => {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    const updateHeight = () => {
      // Use visualViewport if available (better for mobile)
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
      
      // Set CSS custom property for use in styles
      document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
    };

    updateHeight();

    // Listen to both resize and visualViewport changes
    window.addEventListener('resize', updateHeight);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight);
      }
    };
  }, []);

  return viewportHeight;
};

// Hook for safe area insets (for devices with notches)
export const useSafeAreaInsets = () => {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const updateSafeAreaInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeAreaInsets({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
      });
    };

    updateSafeAreaInsets();
    window.addEventListener('resize', updateSafeAreaInsets);
    window.addEventListener('orientationchange', updateSafeAreaInsets);

    return () => {
      window.removeEventListener('resize', updateSafeAreaInsets);
      window.removeEventListener('orientationchange', updateSafeAreaInsets);
    };
  }, []);

  return safeAreaInsets;
};

// Hook for responsive font sizes
export const useResponsiveFontSize = (
  baseFontSize: number,
  scaleFactor: number = 0.1
) => {
  const { width } = useBreakpoint();
  const [fontSize, setFontSize] = useState(baseFontSize);

  useEffect(() => {
    // Scale font size based on viewport width
    const scale = Math.min(Math.max(width / 1200, 0.8), 1.2);
    setFontSize(baseFontSize * scale);
  }, [width, baseFontSize]);

  return fontSize;
};

// Helper hook for detecting touch devices
export const useTouchDevice = (): boolean => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    setIsTouchDevice(checkTouchDevice());
  }, []);

  return isTouchDevice;
}; 