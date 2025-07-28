import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AdminService } from '@/services/adminService';

export const VisitorTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Generate a simple session ID (in production, you'd want something more robust)
        const sessionId = sessionStorage.getItem('visitor_session_id') || 
          Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        sessionStorage.setItem('visitor_session_id', sessionId);
        
        // Get additional visitor information
        const userAgent = navigator.userAgent;
        const referrer = document.referrer || 'direct';
        const timestamp = new Date().toISOString();
        
        // Track the visit with enhanced data
        await AdminService.trackVisitorEnhanced(
          location.pathname, 
          sessionId, 
          userAgent, 
          referrer,
          timestamp
        );
      } catch (error) {
        // Silently fail - don't break the user experience
        console.warn('Failed to track visitor:', error);
      }
    };

    trackVisit();
  }, [location.pathname]);

  return null; // This component doesn't render anything
}; 