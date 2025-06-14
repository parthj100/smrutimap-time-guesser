import React, { useEffect, useState } from 'react';
import { Timer as TimerIcon } from 'lucide-react';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  isActive: boolean;
  onTimeUp: () => void;
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ 
  timeRemaining, 
  totalTime, 
  isActive, 
  onTimeUp, 
  className = "" 
}) => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }

    if (timeRemaining <= 0 && isActive) {
      onTimeUp();
    }
  }, [timeRemaining, isActive, onTimeUp]);

  const percentage = Math.max(0, (timeRemaining / totalTime) * 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getTimerColor = () => {
    if (percentage > 50) return "#22c55e"; // green
    if (percentage > 25) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`relative flex items-center justify-center ${showWarning ? 'animate-pulse' : ''}`}>
        {/* Circular progress */}
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={getTimerColor()}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        
        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-lg font-bold ${showWarning ? 'text-red-500' : 'text-gray-700'}`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>
      
      {/* Warning message */}
      {showWarning && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-red-500 text-sm font-medium whitespace-nowrap">
          Time running out!
        </div>
      )}
    </div>
  );
};

export default Timer;
