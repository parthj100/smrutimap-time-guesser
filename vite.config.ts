import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    strictPort: true,
    allowedHosts: ["smrutimap.onrender.com", "localhost", "127.0.0.1"],
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // Bundle analyzer for development and production
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: mode === 'development',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React chunks
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI and component libraries
          'ui-vendor': [
            '@radix-ui/react-toast', 
            '@radix-ui/react-dialog',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-slider',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-aspect-ratio',
          ],
          
          // Data and state management
          'query-vendor': ['@tanstack/react-query'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Animation and motion
          'motion-vendor': ['framer-motion', 'motion'],
          
          // Maps and charts
          'map-vendor': ['react-leaflet'],
          'chart-vendor': ['recharts'],
          
          // Utilities
          'utils-vendor': [
            'clsx', 
            'class-variance-authority', 
            'tailwind-merge',
            'date-fns',
            'cmdk',
            'input-otp',
            'lucide-react',
            'next-themes',
            'react-day-picker',
            'react-resizable-panels',
            'sonner',
            'tailwindcss-animate',
            'vaul',
          ],
          
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // Game-specific chunks
          'game-core': [
            '@/components/Game',
            '@/components/GameContent',
            '@/components/GameControls',
            '@/components/GameHeader',
            '@/components/GameSummary',
            '@/components/RoundResults',
          ],
          
          'game-ui': [
            '@/components/Home',
            '@/components/GameInstructions',
            '@/components/SettingsPanel',
            '@/components/GameStoryGallery',
            '@/components/InfiniteImageBackground',
            '@/components/GameImage',
            '@/components/OptimizedImage',
          ],
          
          'multiplayer': [
            '@/hooks/useSimpleMultiplayer',
          ],
          
          'admin': [
            '@/pages/Admin',
            '@/services/adminService',
          ],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: mode === 'development',
    // Minify for production
    minify: mode === 'production' ? 'esbuild' : false,
    // Target modern browsers for better performance
    target: 'esnext',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize dependencies
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  optimizeDeps: {
    // Pre-bundle these dependencies for faster dev server startup
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'sonner',
      'react-hook-form',
      'zod',
      'framer-motion',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
    ],
    // Exclude these from pre-bundling
    exclude: [],
  },
  // Enable experimental features for better performance
  esbuild: {
    target: 'esnext',
    // Remove console logs in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    // Optimize JSX
    jsx: 'automatic',
  },
  // CSS optimization
  css: {
    devSourcemap: mode === 'development',
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  // Performance optimizations
  define: {
    __DEV__: mode === 'development',
  },
}));
