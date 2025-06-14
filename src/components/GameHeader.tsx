import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Timer from './Timer';
import ProgressIndicator from './ProgressIndicator';
import { useBreakpoint } from '@/hooks/useResponsive';

interface GameHeaderProps {
  isDailyChallenge: boolean;
  isTimedMode: boolean;
  timeRemaining: number;
  timerType: 'per-round' | 'total-game';
  timerActive: boolean;
  currentRound: number;
  totalRounds: number;
  totalGameScore: number;
  onGoHome: () => void;
  // onShowSettings: () => void; // Preserved for future use
  onTimeUp: () => void;
}

const PER_ROUND_TIME = 60;
const TOTAL_GAME_TIME = 240;

const GameHeader: React.FC<GameHeaderProps> = React.memo(({
  isDailyChallenge,
  isTimedMode,
  timeRemaining,
  timerType,
  timerActive,
  currentRound,
  totalRounds,
  totalGameScore,
  onGoHome,
  onTimeUp
}) => {
  const { isMobile, isTablet } = useBreakpoint();

  // Memoize timer total time calculation
  const totalTime = useMemo(() => 
    timerType === 'per-round' ? PER_ROUND_TIME : TOTAL_GAME_TIME,
    [timerType]
  );

  // Memoize score display formatting
  const formattedScore = useMemo(() => 
    totalGameScore > 0 ? `Score: ${totalGameScore}` : null,
    [totalGameScore]
  );

  // Memoize challenge type styling
  const challengeStyles = useMemo(() => ({
    containerClass: isDailyChallenge ? 'bg-orange-500' : 'bg-[#ea384c]',
    logoAlt: 'SMRUTIMAP Logo'
  }), [isDailyChallenge]);

  return (
    <div className="flex items-center justify-between mb-6 px-6 pt-2">
      <div className="flex items-center">
        <button 
          onClick={onGoHome} 
          className="hover:scale-105 hover:opacity-90 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ea384c] focus:ring-opacity-50 rounded-lg"
          aria-label="Go to home page"
        >
          <img 
            src="/Smruti-map.png" 
            alt={challengeStyles.logoAlt}
            className="h-20 lg:h-28 xl:h-32 w-auto"
          />
        </button>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Timer for timed mode */}
        {isTimedMode && (
          <div>
            <Timer 
              timeRemaining={timeRemaining} 
              totalTime={totalTime} 
              isActive={timerActive} 
              onTimeUp={onTimeUp} 
            />
          </div>
        )}
        
        {/* Round and Score Counter with Progress Indicator */}
        <div className={`${challengeStyles.containerClass} text-white rounded-lg px-8 py-3 mr-2`}>
          <div className="flex flex-col items-center">
            <div className="font-bold pb-1 text-4xl lg:text-5xl xl:text-6xl font-space">
              {currentRound}/{totalRounds}
            </div>
            {formattedScore && (
              <div className="font-semibold text-base lg:text-lg font-inter">
                {formattedScore}
              </div>
            )}
            <div className="mt-2 w-16">
              <ProgressIndicator 
                currentStep={currentRound} 
                totalSteps={totalRounds} 
                showNumbers={false} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default GameHeader;