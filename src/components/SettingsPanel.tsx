import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { resetImagePool, getPoolStats } from '@/utils/imagePool';

interface SettingsPanelProps {
  onClose: () => void;
  userId?: string;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, userId }) => {
  const [poolStats, setPoolStats] = useState<{
    availableImages: number;
    usedImages: number;
    totalImages: number;
    poolProgress: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPoolStats = async () => {
      try {
        const stats = await getPoolStats(userId);
        setPoolStats(stats);
      } catch (error) {
        console.error('Failed to load pool stats:', error);
      }
    };

    loadPoolStats();
  }, [userId]);

  const handleResetImagePool = async () => {
    setLoading(true);
    try {
      await resetImagePool(userId);
      alert('Image pool reset! You\'ll see fresh images on your next game.');
      
      // Refresh stats after reset
      const stats = await getPoolStats(userId);
      setPoolStats(stats);
    } catch (error) {
      alert('Failed to reset image pool. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Image Pool Section */}
          <div className="border-b pb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Image Pool</h3>
            <p className="text-sm text-gray-600 mb-3">
              {userId ? 'Your personal image pool progress:' : 'Guest image pool progress:'}
            </p>
            
            {/* Pool Statistics */}
            {poolStats && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Total Images:</span> {poolStats.totalImages}
                  </div>
                  <div>
                    <span className="font-medium">Used:</span> {poolStats.usedImages}
                  </div>
                  <div>
                    <span className="font-medium">Remaining:</span> {poolStats.availableImages}
                  </div>
                  <div>
                    <span className="font-medium">Progress:</span> {poolStats.poolProgress.toFixed(1)}%
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${poolStats.poolProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mb-3">
              {userId 
                ? 'Your progress is saved across all devices when logged in.'
                : 'Guest progress is saved locally on this device only.'
              }
            </p>
            
            <button
              onClick={handleResetImagePool}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset Image Pool'}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
