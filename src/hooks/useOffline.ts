import { useState, useEffect, useCallback } from 'react';
import { GAME_CONSTANTS } from '@/constants/gameConstants';

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('unknown');

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateConnectionInfo = () => {
      // @ts-ignore - NetworkInformation is experimental
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        setConnectionType(connection.type || 'unknown');
        setEffectiveType(connection.effectiveType || 'unknown');
      }
    };

    updateOnlineStatus();
    updateConnectionInfo();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  const isSlowConnection = useCallback(() => {
    return effectiveType === 'slow-2g' || effectiveType === '2g';
  }, [effectiveType]);

  const isFastConnection = useCallback(() => {
    return effectiveType === '4g' || effectiveType === '5g';
  }, [effectiveType]);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    effectiveType,
    isSlowConnection: isSlowConnection(),
    isFastConnection: isFastConnection(),
  };
};

// Local storage with offline support
export const useOfflineStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  }, [key, value]);

  const removeStoredValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setValue(defaultValue);
    } catch (error) {
      console.error(`Error removing from localStorage:`, error);
    }
  }, [key, defaultValue]);

  return [value, setStoredValue, removeStoredValue] as const;
};

// Offline queue for failed requests
interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

export const useOfflineQueue = () => {
  const [queue, setQueue] = useOfflineStorage<QueuedRequest[]>('offline_queue', []);
  const { isOnline } = useNetworkStatus();

  const addToQueue = useCallback((request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setQueue(prev => [...prev, queuedRequest]);
    return queuedRequest.id;
  }, [setQueue]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(req => req.id !== id));
  }, [setQueue]);

  const processQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;

    const maxRetries = GAME_CONSTANTS.NETWORK.MAX_RETRIES;
    const retryDelay = GAME_CONSTANTS.NETWORK.RETRY_DELAY;

    for (const request of queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers,
          },
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        if (response.ok) {
          removeFromQueue(request.id);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        if (request.retryCount < maxRetries) {
          // Update retry count
          setQueue(prev => 
            prev.map(req => 
              req.id === request.id 
                ? { ...req, retryCount: req.retryCount + 1 }
                : req
            )
          );
          
          // Wait before next retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * (request.retryCount + 1)));
        } else {
          // Max retries reached, remove from queue
          removeFromQueue(request.id);
          console.error(`Failed to process queued request after ${maxRetries} retries:`, error);
        }
      }
    }
  }, [isOnline, queue, removeFromQueue, setQueue]);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, [setQueue]);

  return {
    queue,
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    queueSize: queue.length,
  };
};

// Cache management for offline data
export const useOfflineCache = () => {
  const [cache, setCache] = useOfflineStorage<Record<string, any>>('offline_cache', {});

  const getCachedData = useCallback((key: string) => {
    const cached = cache[key];
    if (!cached) return null;

    const { data, timestamp, ttl } = cached;
    const now = Date.now();

    // Check if cache is expired
    if (ttl && now - timestamp > ttl) {
      // Remove expired cache
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
      return null;
    }

    return data;
  }, [cache, setCache]);

  const setCachedData = useCallback((key: string, data: any, ttl?: number) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now(),
        ttl: ttl || GAME_CONSTANTS.CACHE.DEFAULT_TTL,
      },
    }));
  }, [setCache]);

  const removeCachedData = useCallback((key: string) => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache[key];
      return newCache;
    });
  }, [setCache]);

  const clearCache = useCallback(() => {
    setCache({});
  }, [setCache]);

  const getCacheSize = useCallback(() => {
    return Object.keys(cache).length;
  }, [cache]);

  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    setCache(prev => {
      const newCache: Record<string, any> = {};
      
      Object.entries(prev).forEach(([key, value]) => {
        const { timestamp, ttl } = value;
        if (!ttl || now - timestamp <= ttl) {
          newCache[key] = value;
        }
      });
      
      return newCache;
    });
  }, [setCache]);

  // Clean expired cache on mount and periodically
  useEffect(() => {
    cleanExpiredCache();
    
    const interval = setInterval(cleanExpiredCache, GAME_CONSTANTS.CACHE.CLEANUP_INTERVAL);
    return () => clearInterval(interval);
  }, [cleanExpiredCache]);

  return {
    getCachedData,
    setCachedData,
    removeCachedData,
    clearCache,
    getCacheSize,
    cleanExpiredCache,
  };
};

// Offline-first data fetching
export const useOfflineFirst = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number;
    fallbackData?: T;
    refetchOnReconnect?: boolean;
  } = {}
) => {
  const { ttl, fallbackData, refetchOnReconnect = true } = options;
  const { isOnline } = useNetworkStatus();
  const { getCachedData, setCachedData } = useOfflineCache();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Try to get cached data first
      if (!forceRefresh) {
        const cachedData = getCachedData(key);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          
          // If online, still try to fetch fresh data in background
          if (isOnline) {
            try {
              const freshData = await fetchFn();
              setCachedData(key, freshData, ttl);
              setData(freshData);
            } catch {
              // Ignore background fetch errors, we have cached data
            }
          }
          return;
        }
      }

      // If no cached data or force refresh, try to fetch
      if (isOnline) {
        const freshData = await fetchFn();
        setCachedData(key, freshData, ttl);
        setData(freshData);
      } else {
        // Offline and no cached data, use fallback
        if (fallbackData) {
          setData(fallbackData);
        } else {
          throw new Error('No cached data available and device is offline');
        }
      }
    } catch (err) {
      setError(err as Error);
      
      // Try to use cached data as fallback
      const cachedData = getCachedData(key);
      if (cachedData) {
        setData(cachedData);
      } else if (fallbackData) {
        setData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, isOnline, getCachedData, setCachedData, ttl, fallbackData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && refetchOnReconnect && data) {
      fetchData(true);
    }
  }, [isOnline, refetchOnReconnect, data, fetchData]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale: !isOnline && !!data,
  };
}; 