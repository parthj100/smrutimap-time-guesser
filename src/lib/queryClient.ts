import { QueryClient } from '@tanstack/react-query';
import { GAME_CONSTANTS } from '@/constants/gameConstants';

// Custom retry function with exponential backoff
const retryFunction = (failureCount: number, error: any) => {
  // Don't retry on 4xx errors (client errors)
  if (error?.status >= 400 && error?.status < 500) {
    return false;
  }
  
  // Don't retry more than the max retries
  if (failureCount >= GAME_CONSTANTS.QUERY_CONFIG.MAX_RETRIES) {
    return false;
  }
  
  return true;
};

// Custom retry delay with exponential backoff
const retryDelay = (attemptIndex: number) => {
  const baseDelay = GAME_CONSTANTS.QUERY_CONFIG.RETRY_DELAY_BASE;
  const maxDelay = GAME_CONSTANTS.QUERY_CONFIG.RETRY_DELAY_MAX;
  
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const delay = Math.min(baseDelay * Math.pow(2, attemptIndex), maxDelay);
  
  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  
  return delay + jitter;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Caching configuration
      staleTime: GAME_CONSTANTS.QUERY_CONFIG.STALE_TIME, // 10 minutes
      gcTime: GAME_CONSTANTS.QUERY_CONFIG.GC_TIME, // 30 minutes (formerly cacheTime)
      
      // Retry configuration
      retry: retryFunction,
      retryDelay,
      
      // Background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Network mode
      networkMode: 'online',
      
      // Error handling
      throwOnError: false,
      
      // Performance optimizations
      refetchInterval: false, // Disable automatic refetching by default
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry configuration for mutations
      retry: (failureCount, error: any) => {
        // Only retry on network errors, not client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2; // Max 2 retries for mutations
      },
      retryDelay,
      
      // Network mode
      networkMode: 'online',
      
      // Error handling
      throwOnError: false,
    },
  },
});

// Query key factory for consistent key management
export const queryKeys = {
  // Game images
  gameImages: {
    all: ['gameImages'] as const,
    random: (count: number) => [...queryKeys.gameImages.all, 'random', count] as const,
    daily: (date: string) => [...queryKeys.gameImages.all, 'daily', date] as const,
    pool: (userId?: string) => [...queryKeys.gameImages.all, 'pool', userId] as const,
  },
  
  // User data
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    stats: (userId: string) => [...queryKeys.user.all, 'stats', userId] as const,
    sessions: (userId: string) => [...queryKeys.user.all, 'sessions', userId] as const,
  },
  
  // Leaderboard
  leaderboard: {
    all: ['leaderboard'] as const,
    byMode: (mode: string) => [...queryKeys.leaderboard.all, mode] as const,
    global: () => [...queryKeys.leaderboard.all, 'global'] as const,
  },
  
  // Game sessions
  sessions: {
    all: ['sessions'] as const,
    byId: (sessionId: string) => [...queryKeys.sessions.all, sessionId] as const,
    byUser: (userId: string) => [...queryKeys.sessions.all, 'user', userId] as const,
  },
} as const;

// Utility functions for cache management
export const cacheUtils = {
  // Invalidate all queries for a specific user
  invalidateUserQueries: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.stats(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.sessions(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byUser(userId) });
  },
  
  // Invalidate leaderboard queries
  invalidateLeaderboard: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
  },
  
  // Prefetch game images
  prefetchGameImages: async (count: number = 5) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.gameImages.random(count),
      staleTime: GAME_CONSTANTS.QUERY_CONFIG.STALE_TIME,
    });
  },
  
  // Clear all caches
  clearAllCaches: () => {
    queryClient.clear();
  },
  
  // Get cache stats
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    return {
      totalQueries: cache.getAll().length,
      activeQueries: cache.getAll().filter(query => query.getObserversCount() > 0).length,
      staleQueries: cache.getAll().filter(query => query.isStale()).length,
    };
  },
}; 