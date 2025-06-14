import React from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Generic loading spinner
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <Loader2 
      className={`animate-spin text-[#ea384c] ${sizeClasses[size]} ${className}`} 
    />
  );
};

// Skeleton components
export const SkeletonBox: React.FC<{
  width?: string;
  height?: string;
  className?: string;
}> = ({ width = 'w-full', height = 'h-4', className = '' }) => (
  <div 
    className={`bg-gray-200 rounded animate-pulse ${width} ${height} ${className}`} 
  />
);

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBox 
        key={i}
        width={i === lines - 1 ? 'w-3/4' : 'w-full'}
        height="h-4"
      />
    ))}
  </div>
);

// Game image skeleton
export const GameImageSkeleton: React.FC<{
  className?: string;
}> = ({ className = '' }) => (
  <div className={`relative bg-gray-200 rounded-xl animate-pulse ${className}`}>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <SkeletonBox width="w-16" height="h-16" className="mx-auto mb-4 rounded-lg" />
        <SkeletonBox width="w-32" height="h-4" className="mx-auto" />
      </div>
    </div>
  </div>
);

// Map skeleton
export const MapSkeleton: React.FC<{
  className?: string;
}> = ({ className = '' }) => (
  <div className={`relative bg-gray-200 rounded-xl animate-pulse ${className}`}>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4 animate-pulse" />
        <SkeletonBox width="w-24" height="h-4" className="mx-auto" />
      </div>
    </div>
  </div>
);

// Leaderboard skeleton
export const LeaderboardSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg">
        <SkeletonBox width="w-8" height="h-8" className="rounded-full" />
        <div className="flex-1">
          <SkeletonBox width="w-32" height="h-4" className="mb-2" />
          <SkeletonBox width="w-24" height="h-3" />
        </div>
        <SkeletonBox width="w-16" height="h-6" className="rounded" />
      </div>
    ))}
  </div>
);

// Game card skeleton
export const GameCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-lg animate-pulse">
    <SkeletonBox width="w-full" height="h-48" className="mb-4 rounded-lg" />
    <SkeletonBox width="w-3/4" height="h-6" className="mb-2" />
    <SkeletonText lines={2} />
    <div className="flex justify-between items-center mt-4">
      <SkeletonBox width="w-20" height="h-8" className="rounded" />
      <SkeletonBox width="w-24" height="h-8" className="rounded" />
    </div>
  </div>
);

// Full page loading
export const FullPageLoading: React.FC<{
  message?: string;
}> = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-[#eee9da] flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" className="mb-4" />
      <p className="text-lg text-gray-600">{message}</p>
    </div>
  </div>
);

// Error state with retry
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}> = ({ 
  title = 'Something went wrong',
  message = 'Please try again later',
  onRetry,
  showRetry = true
}) => (
  <div className="text-center p-8">
    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6">{message}</p>
    {showRetry && onRetry && (
      <Button 
        onClick={onRetry}
        className="bg-[#ea384c] hover:bg-red-600 text-white"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    )}
  </div>
);

// Empty state
export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ 
  title = 'No data found',
  message = 'There\'s nothing to show here yet',
  action,
  icon
}) => (
  <div className="text-center p-8">
    {icon || (
      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v1" />
        </svg>
      </div>
    )}
    <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6">{message}</p>
    {action}
  </div>
);

// Inline loading for buttons
export const ButtonLoading: React.FC<{
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}> = ({ children, loading = false, className = '' }) => (
  <div className={`flex items-center justify-center ${className}`}>
    {loading && <LoadingSpinner size="sm" className="mr-2" />}
    {children}
  </div>
);

// Progress bar
export const ProgressBar: React.FC<{
  progress: number;
  className?: string;
  showPercentage?: boolean;
}> = ({ progress, className = '', showPercentage = false }) => (
  <div className={`w-full ${className}`}>
    <div className="flex justify-between items-center mb-1">
      {showPercentage && (
        <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
      )}
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-[#ea384c] h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);

// Shimmer effect for loading cards
export const ShimmerCard: React.FC<{
  className?: string;
}> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-gray-200 rounded-lg ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

// Add shimmer animation to global CSS
const shimmerStyles = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
} 