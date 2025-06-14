import { useEffect, useCallback, useRef } from 'react';
import { toast } from "sonner";

interface UseGameTimerProps {
  timeRemaining: number;
  timerActive: boolean;
  isGuessing: boolean;
  hasGuessed: boolean;
  timerType: 'per-round' | 'total-game';
  onTimeUpdate: (time: number) => void;
  onTimeUp: () => void;
}

export const useGameTimer = ({
  timeRemaining,
  timerActive,
  isGuessing,
  hasGuessed,
  timerType,
  onTimeUpdate,
  onTimeUp
}: UseGameTimerProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeRemainingRef = useRef(timeRemaining);
  
  // Use refs for callbacks to avoid stale closures
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onTimeUpRef = useRef(onTimeUp);
  
  // Update refs when props change
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
    onTimeUpdateRef.current = onTimeUpdate;
    onTimeUpRef.current = onTimeUp;
  }, [timeRemaining, onTimeUpdate, onTimeUp]);

  // Timer effect
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (timerActive && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        const currentTime = timeRemainingRef.current;
        if (currentTime > 0) {
          const newTime = currentTime - 1;
          timeRemainingRef.current = newTime;
          onTimeUpdateRef.current(newTime);
        } else {
          // Time's up
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onTimeUpRef.current();
        }
      }, 1000);
    } else if (timeRemaining <= 0 && timerActive) {
      // Handle time up scenarios
      if (isGuessing && !hasGuessed) {
        toast.warning("Time's up! Auto-submitting your guess...");
        onTimeUpRef.current();
      } else if (timerType === 'total-game') {
        onTimeUpRef.current();
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerActive, timeRemaining, isGuessing, hasGuessed, timerType]);

  const handleTimeUp = useCallback(() => {
    onTimeUp();
  }, [onTimeUp]);

  return {
    handleTimeUp
  };
};
