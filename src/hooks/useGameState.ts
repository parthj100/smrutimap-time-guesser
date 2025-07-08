import { useState, useCallback, useMemo } from 'react';
import { GameState, GameImage, GuessResult } from '@/types/game';
import { preloadNextGameImages } from '@/utils/imagePreloader';
import { GAME_CONSTANTS } from '@/constants/gameConstants';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 0,
    totalRounds: GAME_CONSTANTS.GAME_RULES.DEFAULT_TOTAL_ROUNDS,
    currentImage: null,
    results: [],
    isGuessing: false,
    hasGuessed: false,
    gameOver: false,
    usedImageIds: [],
    isTimedMode: false,
    timerType: 'per-round',
    timeRemaining: 0,
    timerActive: false,
    customTimerDuration: undefined
  });

  const [yearGuess, setYearGuess] = useState<number | null>(null);
  const [locationGuess, setLocationGuess] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [totalGameScore, setTotalGameScore] = useState<number>(0);

  // Memoize total game score calculation
  const calculatedTotalScore = useMemo(() => {
    if (gameState.results.length === 0) return 0;
    
    return gameState.results.reduce((sum, result) => {
      // Use scaled score if available, otherwise fall back to display scores or raw scores
      if (result.scaledScore !== undefined) {
        return sum + result.scaledScore;
      }
      
      if (result.displayYearScore !== undefined && result.displayLocationScore !== undefined) {
        return sum + result.displayYearScore + result.displayLocationScore + (result.timeBonus || 0);
      }
      
      return sum + (result.totalScore * 100) + (result.timeBonus || 0);
    }, 0);
  }, [gameState.results]);

  // Update total score when it changes
  useMemo(() => {
    if (calculatedTotalScore !== totalGameScore) {
      setTotalGameScore(calculatedTotalScore);
    }
  }, [calculatedTotalScore, totalGameScore]);

  const initializeGame = useCallback((
    images: GameImage[], 
    isTimedMode: boolean = false, 
    timerType: 'per-round' | 'total-game' = 'per-round',
    customTimerDuration?: number
  ) => {
    if (!images || images.length === 0) {
      console.error('Cannot initialize game: no images provided');
      return;
    }

    const initialTimeRemaining = isTimedMode 
      ? (customTimerDuration || (timerType === 'per-round' ? GAME_CONSTANTS.TIMERS.PER_ROUND_TIME : GAME_CONSTANTS.TIMERS.TOTAL_GAME_TIME))
      : 0;

    setGameState({
      currentRound: 1,
      totalRounds: Math.min(images.length, GAME_CONSTANTS.GAME_RULES.DEFAULT_TOTAL_ROUNDS),
      currentImage: images[0],
      results: [],
      isGuessing: true,
      hasGuessed: false,
      gameOver: false,
      usedImageIds: [images[0].id],
      isTimedMode,
      timerType,
      timeRemaining: initialTimeRemaining,
      timerActive: isTimedMode,
      roundStartTime: Date.now(),
      customTimerDuration
    });

    // Reset guesses
    setYearGuess(null);
    setLocationGuess(null);
    setTotalGameScore(0);

    // Preload next images for better performance
    if (images.length > 1) {
      const imagesToPreload = images.slice(1, Math.min(images.length, GAME_CONSTANTS.GAME_RULES.IMAGE_PRELOAD_COUNT + 1));
      preloadNextGameImages(images, 0);
    }
  }, []);

  const addResult = useCallback((result: GuessResult) => {
    setGameState(prev => ({
      ...prev,
      results: [...prev.results, result],
      hasGuessed: true,
      isGuessing: false,
      timerActive: false
    }));
  }, []);

  const nextRound = useCallback((images: GameImage[]) => {
    setGameState(prev => {
      const nextRoundNumber = prev.currentRound + 1;
      const isGameComplete = nextRoundNumber > prev.totalRounds;
      
      if (isGameComplete) {
        return {
          ...prev,
          gameOver: true,
          timerActive: false
        };
      }

      const nextImage = images[nextRoundNumber - 1];
      if (!nextImage) {
        console.error('No image available for round', nextRoundNumber);
        return {
          ...prev,
          gameOver: true,
          timerActive: false
        };
      }

      const newTimeRemaining = prev.isTimedMode && prev.timerType === 'per-round' 
        ? (prev.customTimerDuration || GAME_CONSTANTS.TIMERS.PER_ROUND_TIME)
        : prev.timeRemaining;

      return {
        ...prev,
        currentRound: nextRoundNumber,
        currentImage: nextImage,
        isGuessing: true,
        hasGuessed: false,
        usedImageIds: [...prev.usedImageIds, nextImage.id],
        timeRemaining: newTimeRemaining,
        timerActive: prev.isTimedMode,
        roundStartTime: Date.now()
      };
    });

    // Reset guesses for new round
    setYearGuess(null);
    setLocationGuess(null);

    // Preload next images
    setGameState(prev => {
      const nextImageIndex = prev.currentRound; // This will be the new current round after state update
      if (images.length > nextImageIndex) {
        const imagesToPreload = images.slice(
          nextImageIndex, 
          Math.min(images.length, nextImageIndex + GAME_CONSTANTS.GAME_RULES.IMAGE_PRELOAD_COUNT)
        );
        preloadNextGameImages(images, nextImageIndex);
      }
      return prev;
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState({
      currentRound: 0,
      totalRounds: GAME_CONSTANTS.GAME_RULES.DEFAULT_TOTAL_ROUNDS,
      currentImage: null,
      results: [],
      isGuessing: false,
      hasGuessed: false,
      gameOver: false,
      usedImageIds: [],
      isTimedMode: false,
      timerType: 'per-round',
      timeRemaining: 0,
      timerActive: false,
      customTimerDuration: undefined
    });
    setYearGuess(null);
    setLocationGuess(null);
    setTotalGameScore(0);
  }, []);

  const updateTimer = useCallback((newTime: number, isActive: boolean) => {
    setGameState(prev => ({
      ...prev,
      timeRemaining: Math.max(0, newTime),
      timerActive: isActive && newTime > 0
    }));
  }, []);

  return {
    gameState,
    yearGuess,
    setYearGuess,
    locationGuess,
    setLocationGuess,
    totalGameScore,
    initializeGame,
    addResult,
    nextRound,
    resetGame,
    updateTimer
  };
};
