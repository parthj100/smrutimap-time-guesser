// Game Configuration Constants
export const GAME_CONSTANTS = {
  // Year range for the game
  YEAR_RANGE: {
    MIN: 1900,
    MAX: 2025,
    DEFAULT: Math.floor((1900 + 2025) / 2) // 1962
  },
  
  // Timer configurations
  TIMERS: {
    PER_ROUND_TIME: 60, // seconds
    TOTAL_GAME_TIME: 240, // seconds (4 minutes)
  },
  
  // Database timeout configurations
  TIMEOUTS: {
    AUTH_OPERATIONS: 5000, // 5 seconds
    DATABASE_QUERIES: 3000, // 3 seconds
    CONNECTIVITY_TEST: 3000, // 3 seconds
    PROFILE_CREATION: 5000, // 5 seconds
    SESSION_CHECK: 5000, // 5 seconds
    USER_SIGN_IN: 10000, // 10 seconds
    USER_SIGN_UP: 10000, // 10 seconds
  },
  
  // UI Dimensions
  UI: {
    MAP_HEIGHT: '700px',
    IMAGE_MAX_HEIGHT: '800px',
    IMAGE_MIN_HEIGHT: '400px',
    IMAGE_DEFAULT_HEIGHT: '500px',
    GAME_HEADER_LOGO_HEIGHT: '28', // h-28 class
    YEAR_DISPLAY_HEIGHT: '84px',
    SUBMIT_BUTTON_HEIGHT: '84px',
  },
  
  // Game Rules
  GAME_RULES: {
    DEFAULT_TOTAL_ROUNDS: 5,
    MAX_IMAGES_IN_CACHE: 20,
    IMAGE_PRELOAD_COUNT: 3,
  },
  
  // Scoring
  SCORING: {
    MAX_RAW_SCORE: 100,
    DISPLAY_MULTIPLIER: 50,
    MAX_DISPLAY_SCORE_PER_CATEGORY: 5000,
    MAX_TOTAL_DISPLAY_SCORE: 10000,
    TIME_BONUS_MULTIPLIER: 2,
  },
  
  // Animation and Performance
  ANIMATION: {
    CAROUSEL_SPEEDS: [120, 110, 100, 90], // seconds for each column
    CAROUSEL_COLUMN_WIDTH: 18, // percentage
    CAROUSEL_GAP_WIDTH: 2, // percentage
    IMAGE_HEIGHT: 200, // pixels
  },
  
  // Storage Keys
  STORAGE_KEYS: {
    IMAGE_POOL: 'smrutimap_image_pool',
    USED_IMAGES: 'smrutimap_used_images',
  },
  
  // Image Quality Configuration
  IMAGE_QUALITY: {
    COMPRESSION: 85, // Quality percentage for image compression
    RESOLUTION: {
      WIDTH: 1600,
      HEIGHT: 1200,
    },
    RESPONSIVE_BREAKPOINTS: {
      SMALL: 640,   // Mobile
      MEDIUM: 1024, // Tablet
      LARGE: 1920,  // Desktop
    }
  },
  
  // React Query Configuration
  QUERY_CONFIG: {
    STALE_TIME: 10 * 60 * 1000, // 10 minutes
    GC_TIME: 30 * 60 * 1000, // 30 minutes (garbage collection time)
    MAX_RETRIES: 3,
    RETRY_DELAY_BASE: 1000, // 1 second
    RETRY_DELAY_MAX: 30000, // 30 seconds
  },
  
  // Toast Configuration
  TOAST: {
    LIMIT: 1,
    REMOVE_DELAY: 1000000, // Very long delay for manual dismissal
  },
  
  // Performance Monitoring
  PERFORMANCE: {
    MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
    FPS_THRESHOLD: 30,
    LOAD_TIME_THRESHOLD: 3000, // 3 seconds
  },

  // Network configuration
  NETWORK: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    TIMEOUT: 10000, // 10 seconds
    SLOW_CONNECTION_THRESHOLD: 2000, // 2 seconds
  },

  // Cache configuration
  CACHE: {
    DEFAULT_TTL: 30 * 60 * 1000, // 30 minutes
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 50, // Maximum number of cached items
    IMAGE_CACHE_TTL: 60 * 60 * 1000, // 1 hour for images
  },
} as const;

// Environment Configuration
export const ENV_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "https://rhxbadjyjjjrjpvfhpap.supabase.co",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeGJhZGp5ampqcmpwdmZocGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDUyMTUsImV4cCI6MjA2MzUyMTIxNX0.Z7sfOz6dgSgjKyJspwoYPz4gbJwYRe8zxpNYV_YeonA",
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBdrreySEkWF2MGQAgo1v33zEi_n_ifPtQ",
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
} as const;

// Email generation utility
export const createUserEmail = (username: string): string => {
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }
  
  const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (sanitizedUsername.length < 3) {
    throw new Error('Username must contain at least 3 alphanumeric characters');
  }
  
  return `${sanitizedUsername}@localhost.local`;
};

// Type exports for better type safety
export type GameConstants = typeof GAME_CONSTANTS;
export type EnvConfig = typeof ENV_CONFIG; 