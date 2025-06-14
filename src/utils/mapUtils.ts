import { ENV_CONFIG } from '@/constants/gameConstants';

// Global flag to track if Google Maps is loaded
let isGoogleMapsLoaded = false;
let isGoogleMapsLoading = false;
const loadPromises: Promise<void>[] = [];

/**
 * Loads the Google Maps JavaScript API script
 * Returns a promise that resolves when the script is loaded
 * Handles multiple simultaneous calls gracefully
 */
export const loadGoogleMapsScript = (): Promise<void> => {
  // If already loaded, return resolved promise
  if (isGoogleMapsLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (isGoogleMapsLoading && loadPromises.length > 0) {
    return loadPromises[0];
  }

  // Start loading
  isGoogleMapsLoading = true;
  
  const loadPromise = new Promise<void>((resolve, reject) => {
    // Create a unique callback name to avoid conflicts
    const callbackName = `initGoogleMaps_${Date.now()}`;
    
    // Set up the global callback
    (window as any)[callbackName] = () => {
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      
      // Clean up the global callback
      delete (window as any)[callbackName];
      
      resolve();
    };

    // Create and append the script with optimized loading
    const script = document.createElement('script');
    // Removed places library as it's not needed for our use case, optimized for faster loading
    script.src = `https://maps.googleapis.com/maps/api/js?key=${ENV_CONFIG.GOOGLE_MAPS_API_KEY}&callback=${callbackName}&loading=async`;
    script.defer = true;
    script.async = true;
    
    script.onerror = () => {
      isGoogleMapsLoading = false;
      delete (window as any)[callbackName];
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  loadPromises.push(loadPromise);
  return loadPromise;
};

/**
 * Checks if Google Maps is available
 */
export const isGoogleMapsAvailable = (): boolean => {
  return !!(window.google?.maps);
};

/**
 * Utility to clean up Google Maps elements
 */
export const cleanupMapElements = (markers: google.maps.Marker[] = [], lines: google.maps.Polyline[] = []) => {
  markers.forEach(marker => {
    if (marker && marker.setMap) {
      marker.setMap(null);
    }
  });
  
  lines.forEach(line => {
    if (line && line.setMap) {
      line.setMap(null);
    }
  });
};

/**
 * Creates a map with default options
 */
export const createMapWithDefaults = (container: HTMLElement, options: Partial<google.maps.MapOptions> = {}): google.maps.Map => {
  const defaultOptions: google.maps.MapOptions = {
    zoom: 2,
    center: { lat: 20, lng: 0 },
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    ...options
  };

  return new google.maps.Map(container, defaultOptions);
};

/**
 * Creates an optimized map with performance settings for fast zooming and interaction
 */
export const createOptimizedMap = (container: HTMLElement, options: Partial<google.maps.MapOptions> = {}): google.maps.Map => {
  const optimizedOptions: google.maps.MapOptions = {
    zoom: 2,
    center: { lat: 20, lng: 0 },
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    fullscreenControl: false,
    streetViewControl: false,
    
    // Performance optimizations
    gestureHandling: "greedy", // Faster gesture handling
    scrollwheel: true, // Enable scroll wheel zoom
    disableDoubleClickZoom: false, // Keep double-click zoom for UX
    draggable: true, // Keep dragging enabled
    keyboardShortcuts: true, // Enable keyboard shortcuts
    
    // Rendering optimizations
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_CENTER,
    },
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER,
    },
    
    // Improved zoom settings
    minZoom: 1,
    maxZoom: 18,
    
    // Enhanced interaction settings
    clickableIcons: false, // Disable clickable POI icons for better performance
    
    ...options
  };

  return new google.maps.Map(container, optimizedOptions);
};

/**
 * Creates a marker with default styling
 */
export const createMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  options: Partial<google.maps.MarkerOptions> = {}
): google.maps.Marker => {
  return new google.maps.Marker({
    position,
    map,
    ...options
  });
};

/**
 * Creates a polyline (for guess lines) with default styling
 */
export const createPolyline = (
  map: google.maps.Map,
  path: google.maps.LatLngLiteral[],
  options: Partial<google.maps.PolylineOptions> = {}
): google.maps.Polyline => {
  const defaultOptions: google.maps.PolylineOptions = {
    path,
    geodesic: true,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
    ...options
  };

  return new google.maps.Polyline({
    ...defaultOptions,
    map
  });
};

/**
 * Smoothly transitions map view to show specific bounds with animation
 */
export const smoothFitBounds = (
  map: google.maps.Map, 
  bounds: google.maps.LatLngBounds, 
  padding: number = 50
): void => {
  // Use fitBounds with smooth animation
  map.fitBounds(bounds, padding);
};

/**
 * Optimized marker creation with performance settings
 */
export const createOptimizedMarker = (
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  options: Partial<google.maps.MarkerOptions> = {}
): google.maps.Marker => {
  return new google.maps.Marker({
    position,
    map,
    // Optimization: disable marker animations for better performance
    animation: null,
    // Use optimized icon rendering
    optimized: true,
    ...options
  });
};

/**
 * Batch update multiple markers efficiently
 */
export const batchUpdateMarkers = (
  markers: google.maps.Marker[],
  updateFn: (marker: google.maps.Marker, index: number) => void
): void => {
  // Use requestAnimationFrame for smooth batch updates
  requestAnimationFrame(() => {
    markers.forEach((marker, index) => {
      updateFn(marker, index);
    });
  });
}; 