import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { queryClient } from "@/lib/queryClient";
import { useSkipLinks } from "@/hooks/useAccessibility";
import { useEffect, Suspense, lazy } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatus from "@/components/NetworkStatus";
import { VisitorTracker } from "@/components/VisitorTracker";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import PerformanceMonitor from "@/components/PerformanceMonitor";

// Lazy load all pages for better performance
const Index = lazy(() => import("./pages/Index"));
const CustomImages = lazy(() => import("./pages/CustomImages"));
const Admin = lazy(() => import("./pages/Admin"));
const Duels = lazy(() => import("./pages/Duels"));
const DuelPage = lazy(() => import("./pages/Duel"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for lazy-loaded routes
const RouteLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

const App = () => {
  const { addSkipLinks } = useSkipLinks();

  // Add skip links for accessibility
  useEffect(() => {
    const cleanup = addSkipLinks([
      { targetId: 'main-content', text: 'Skip to main content' },
      { targetId: 'game-area', text: 'Skip to game' },
    ]);

    return cleanup;
  }, [addSkipLinks]);

  return (
    <ErrorBoundary>
      {/* reducedMotion="user" makes every framer-motion animation respect the
          OS "reduce motion" setting without per-component changes. */}
      <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ProfileProvider>
            <NetworkStatus />
            <Sonner />
            <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} showMetrics={false} />
            <BrowserRouter>
              <VisitorTracker />
              <main id="main-content" tabIndex={-1}>
                <Suspense fallback={<RouteLoading />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/custom-images" element={<CustomImages />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/duels" element={<Duels />} />
                    <Route path="/duel/:code" element={<DuelPage />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
            </BrowserRouter>
          </ProfileProvider>
        </TooltipProvider>
      </QueryClientProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
};

export default App;
