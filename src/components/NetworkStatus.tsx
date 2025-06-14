import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NetworkStatusProps {
  className?: string;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);
  const [connectionType, setConnectionType] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    const updateConnectionType = () => {
      // @ts-ignore - connection API is experimental
      if ('connection' in navigator) {
        // @ts-ignore
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          setConnectionType(connection.effectiveType || connection.type || '');
        }
      }
    };

    // Initial setup
    updateConnectionType();
    if (!isOnline) setShowStatus(true);

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // @ts-ignore
    if ('connection' in navigator && navigator.connection) {
      // @ts-ignore
      navigator.connection.addEventListener('change', updateConnectionType);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // @ts-ignore
      if ('connection' in navigator && navigator.connection) {
        // @ts-ignore
        navigator.connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, [isOnline]);

  if (!showStatus && isOnline) return null;

  return (
    <AnimatePresence>
      {showStatus && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm border-2 text-sm font-medium ${
              isOnline
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi size={16} className="text-green-600" />
                <span>
                  Back online
                  {connectionType && ` (${connectionType.toUpperCase()})`}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-red-600" />
                <AlertTriangle size={14} className="text-red-600" />
                <span>No internet connection</span>
              </>
            )}
          </div>
          
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-2 text-center"
            >
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1 rounded-lg text-xs">
                Some features may not work offline
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatus; 