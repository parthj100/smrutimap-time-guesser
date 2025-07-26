import { GuessResult } from '@/types/game';
import { calculateDistance } from '@/utils/gameUtils';

// Scoring constants
export const SCORE_CONSTANTS = {
  MAX_RAW_SCORE: 100,
  DISPLAY_MULTIPLIER: 50, // Raw score * 50 = display score (max 5000 per category)
  MAX_DISPLAY_SCORE_PER_CATEGORY: 5000,
  MAX_TOTAL_DISPLAY_SCORE: 10000,
  TIME_BONUS_MULTIPLIER: 1.5 // seconds left * 1.5 = bonus points (reduced from 2)
} as const;

// Calculate year score based on how close the guess is to the actual year - INCREASED DIFFICULTY
export const calculateYearScore = (actualYear: number, guessedYear: number): number => {
  const yearDiff = Math.abs(actualYear - guessedYear);
  
  // Increased difficulty - harder to get high scores
  // Perfect guess (exact year)
  if (yearDiff === 0) return 100;
  
  // Excellent precision (1-2 years) - reduced perfect range
  if (yearDiff <= 2) return Math.round(100 - yearDiff * 5); // 100 to 90
  
  // Very good (3-8 years) - steeper drop
  if (yearDiff <= 8) return Math.round(90 - (yearDiff - 2) * 4); // 90 to 66
  
  // Good (9-20 years) - faster decline
  if (yearDiff <= 20) return Math.round(66 - (yearDiff - 8) * 2.5); // 66 to 36
  
  // Fair (21-40 years) - moderate rewards
  if (yearDiff <= 40) return Math.round(36 - (yearDiff - 20) * 1.2); // 36 to 12
  
  // Poor (41-80 years) - minimal rewards
  if (yearDiff <= 80) return Math.round(12 - (yearDiff - 40) * 0.15); // 12 to 6
  
  // Very poor (>80 years) - very minimal
  return Math.max(1, Math.round(6 - (yearDiff - 80) * 0.05));
};

// Calculate location score based on distance in kilometers - INCREASED DIFFICULTY
export const calculateLocationScore = (
  actualLat: number,
  actualLng: number,
  guessedLat: number,
  guessedLng: number
): number => {
  const distance = calculateDistance(
    actualLat,
    actualLng,
    guessedLat,
    guessedLng
  );
  
  // Convert km to miles for calculation
  const distanceMiles = distance * 0.621371;
  
  // Increased difficulty - harder to get high scores
  // Perfect guess (within 5 miles) - kept same
  if (distanceMiles < 5) return 100;
  
  // Excellent precision (5-25 miles) - much steeper drop
  if (distanceMiles < 25) return Math.round(100 - (distanceMiles - 5) * 1.5); // 100 to 70
  
  // Very good (25-75 miles) - much faster decline
  if (distanceMiles < 75) return Math.round(70 - (distanceMiles - 25) * 0.8); // 70 to 30
  
  // Good (75-200 miles) - steeper decline
  if (distanceMiles < 200) return Math.round(30 - (distanceMiles - 75) * 0.12); // 30 to 15
  
  // Fair (200-500 miles) - minimal rewards
  if (distanceMiles < 500) return Math.round(15 - (distanceMiles - 200) * 0.03); // 15 to 6
  
  // Poor (500-1500 miles) - very minimal
  if (distanceMiles < 1500) return Math.round(6 - (distanceMiles - 500) * 0.003); // 6 to 3
  
  // Very poor (1500+ miles) - minimal but not zero
  return Math.max(1, Math.round(3 - (distanceMiles - 1500) * 0.001));
};

// Calculate total score - FIXED: Now just adds display scores instead of weighted calculation
export const calculateTotalScore = (yearScore: number, locationScore: number): number => {
  // This is now just used for internal raw score calculations - not for display
  return Math.round((yearScore * 0.4) + (locationScore * 0.6));
};

// Calculate time bonus for timed rounds
export const calculateTimeBonus = (
  timeRemaining: number, 
  isTimedMode: boolean, 
  timerType: 'per-round' | 'total-game'
): number => {
  if (!isTimedMode || timerType !== 'per-round') {
    return 0;
  }
  
  return Math.max(0, Math.floor(timeRemaining * SCORE_CONSTANTS.TIME_BONUS_MULTIPLIER));
};

// Create a standardized guess result with all score calculations
export interface ScoreBreakdown {
  yearScore: number; // Raw score 0-100
  locationScore: number; // Raw score 0-100
  totalScore: number; // Raw score 0-100 (for internal use only)
  timeBonus: number; // Bonus points from time
  displayYearScore: number; // Year score * 50 (0-5000)
  displayLocationScore: number; // Location score * 50 (0-5000)
  displayTotalScore: number; // FIXED: Sum of display scores + bonus (0-10000+)
}

export const calculateCompleteScore = (
  actualYear: number,
  actualLat: number,
  actualLng: number,
  guessedYear: number,
  guessedLat: number,
  guessedLng: number,
  timeRemaining: number = 0,
  isTimedMode: boolean = false,
  timerType: 'per-round' | 'total-game' = 'per-round'
): ScoreBreakdown => {
  
  const yearScore = calculateYearScore(actualYear, guessedYear);
  const locationScore = calculateLocationScore(actualLat, actualLng, guessedLat, guessedLng);
  const totalScore = calculateTotalScore(yearScore, locationScore); // Keep for internal use
  const timeBonus = calculateTimeBonus(timeRemaining, isTimedMode, timerType);
  
  const displayYearScore = yearScore * SCORE_CONSTANTS.DISPLAY_MULTIPLIER;
  const displayLocationScore = locationScore * SCORE_CONSTANTS.DISPLAY_MULTIPLIER;
  
  // FIXED: Display total is now the sum of display scores + time bonus
  const displayTotalScore = displayYearScore + displayLocationScore + timeBonus;
  
  console.log('🔧 Score calculation breakdown:', {
    yearScore,
    locationScore,
    totalScore,
    timeBonus,
    displayYearScore,
    displayLocationScore,
    displayTotalScore,
    calculation: `${displayYearScore} + ${displayLocationScore} + ${timeBonus} = ${displayTotalScore}`
  });
  
  return {
    yearScore,
    locationScore,
    totalScore,
    timeBonus,
    displayYearScore,
    displayLocationScore,
    displayTotalScore
  };
};

// Calculate final game score based on all rounds
export const calculateFinalScore = (results: GuessResult[]): number => {
  if (results.length === 0) return 0;
  
  return results.reduce((sum, result) => {
    // Use the scaledScore if available, otherwise calculate from display scores
    const score = result.scaledScore || 
      ((result.displayYearScore || 0) + (result.displayLocationScore || 0) + (result.timeBonus || 0));
    return sum + score;
  }, 0);
};

// Get feedback based on score (per round)
export const getScoreFeedback = (score: number, isDisplayScore: boolean = true): string => {
  // For display scores, we need to normalize against the max possible (10000+)
  const normalizedScore = isDisplayScore ? score / (SCORE_CONSTANTS.MAX_TOTAL_DISPLAY_SCORE) * 100 : score;
  
  if (normalizedScore >= 90) return "Amazing!";
  if (normalizedScore >= 75) return "Great job!";
  if (normalizedScore >= 60) return "Good work!";
  if (normalizedScore >= 45) return "Not bad!";
  if (normalizedScore >= 30) return "Keep practicing!";
  return "Try again!";
};

// Get feedback for final game score
export const getFinalScoreFeedback = (totalScore: number, numberOfRounds: number): string => {
  const averageScore = totalScore / numberOfRounds;
  const normalizedAverage = averageScore / SCORE_CONSTANTS.MAX_TOTAL_DISPLAY_SCORE * 100;
  
  if (normalizedAverage >= 80) return "Outstanding performance!";
  if (normalizedAverage >= 65) return "Excellent work!";
  if (normalizedAverage >= 50) return "Great job overall!";
  if (normalizedAverage >= 35) return "Good effort!";
  if (normalizedAverage >= 20) return "Keep improving!";
  return "Practice makes perfect!";
};
