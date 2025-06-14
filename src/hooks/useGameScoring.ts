
import { useCallback } from 'react';
import { calculateCompleteScore } from '@/utils/scoringSystem';
import { GuessResult, GameImage } from '@/types/game';
import { toast } from "sonner";

export const useGameScoring = () => {
  const calculateAndCreateResult = useCallback((
    currentImage: GameImage,
    yearGuess: number,
    locationGuess: { lat: number; lng: number },
    timeRemaining: number,
    isTimedMode: boolean,
    timerType: 'per-round' | 'total-game',
    roundStartTime?: number,
    isAutoSubmit: boolean = false
  ): GuessResult => {
    const roundEndTime = Date.now();
    const timeUsed = roundStartTime ? Math.floor((roundEndTime - roundStartTime) / 1000) : 0;

    const scoreBreakdown = calculateCompleteScore(
      currentImage.year,
      currentImage.location.lat,
      currentImage.location.lng,
      yearGuess,
      locationGuess.lat,
      locationGuess.lng,
      timeRemaining,
      isTimedMode,
      timerType
    );

    console.log('📊 Score breakdown:', scoreBreakdown);

    const result: GuessResult = {
      imageId: currentImage.id,
      imageUrl: currentImage.image_url,
      yearGuess,
      locationGuess,
      actualYear: currentImage.year,
      actualLocation: {
        lat: currentImage.location.lat,
        lng: currentImage.location.lng,
        name: currentImage.location.name
      },
      yearScore: scoreBreakdown.yearScore,
      locationScore: scoreBreakdown.locationScore,
      totalScore: scoreBreakdown.totalScore,
      scaledScore: scoreBreakdown.displayTotalScore,
      timeUsed,
      displayYearScore: scoreBreakdown.displayYearScore,
      displayLocationScore: scoreBreakdown.displayLocationScore,
      timeBonus: scoreBreakdown.timeBonus
    };

    console.log('📊 Final result stored:', result);

    // Show time bonus notification if applicable
    if (scoreBreakdown.timeBonus > 0) {
      toast.success(`Time bonus: +${scoreBreakdown.timeBonus} points!`);
    }

    return result;
  }, []);

  return {
    calculateAndCreateResult
  };
};
