import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { useSkipLinks } from "@/hooks/useAccessibility";
import { useEffect } from "react";
import Index from "./pages/Index";
import CustomImages from "./pages/CustomImages";
import Admin from "./pages/Admin";

import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatus from "@/components/NetworkStatus";
import { VisitorTracker } from "@/components/VisitorTracker";
import { ProfileProvider } from "@/contexts/ProfileContext";

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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ProfileProvider>
            <NetworkStatus />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <VisitorTracker />
              <main id="main-content" tabIndex={-1}>
                <Routes>
                  <Route path="/" element={<Index />} />

                  <Route path="/custom-images" element={<CustomImages />} />
                  <Route path="/admin" element={<Admin />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </BrowserRouter>
          </ProfileProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
