import { GuessResult } from '@/types/game';
import { calculateDistance } from '@/utils/gameUtils';

// Scoring constants
export const SCORE_CONSTANTS = {
  MAX_RAW_SCORE: 100,
  DISPLAY_MULTIPLIER: 50, // Raw score * 50 = display score (max 5000 per category)
  MAX_DISPLAY_SCORE_PER_CATEGORY: 5000,
  MAX_TOTAL_DISPLAY_SCORE: 10000,
  TIME_BONUS_MULTIPLIER: 2 // seconds left * 2 = bonus points
} as const;

// Calculate year score based on how close the guess is to the actual year - TIMEGUESSR STYLE
export const calculateYearScore = (actualYear: number, guessedYear: number): number => {
  const yearDiff = Math.abs(actualYear - guessedYear);
  
  // TimeGuessr-style year scoring - much more lenient
  // Perfect guess (exact year)
  if (yearDiff === 0) return 100;
  
  // Excellent precision (1-3 years) - very high reward like TimeGuessr
  if (yearDiff <= 3) return Math.round(100 - yearDiff * 2.67); // 100 to 92 (matches TimeGuessr's 3yr = 92%)
  
  // Very good (4-10 years) - generous scoring
  if (yearDiff <= 10) return Math.round(92 - (yearDiff - 3) * 3); // 92 to 71
  
  // Good (11-25 years) - still decent rewards
  if (yearDiff <= 25) return Math.round(71 - (yearDiff - 10) * 2); // 71 to 41
  
  // Fair (26-50 years) - moderate rewards
  if (yearDiff <= 50) return Math.round(41 - (yearDiff - 25) * 1); // 41 to 16
  
  // Poor (51-100 years) - still some reward
  if (yearDiff <= 100) return Math.round(16 - (yearDiff - 50) * 0.2); // 16 to 6
  
  // Very poor (>100 years) - minimal but not zero
  return Math.max(1, Math.round(6 - (yearDiff - 100) * 0.05));
};

// Calculate location score based on distance in kilometers - TIMEGUESSR STYLE
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
  
  // Convert km to miles for TimeGuessr-style calculation
  const distanceMiles = distance * 0.621371;
  
  // TimeGuessr-style location scoring - very generous
  // Perfect guess (within 10 miles) - extended perfect range
  if (distanceMiles < 10) return 100;
  
  // Excellent precision (10-50 miles) - high reward
  if (distanceMiles < 50) return Math.round(100 - (distanceMiles - 10) * 0.5); // 100 to 80
  
  // Very good (50-150 miles) - generous scoring
  if (distanceMiles < 150) return Math.round(80 - (distanceMiles - 50) * 0.3); // 80 to 50
  
  // Good (150-400 miles) - matches TimeGuessr's ~266mi = 81% (4072/5000)
  if (distanceMiles < 400) return Math.round(50 - (distanceMiles - 150) * 0.12); // 50 to 20
  
  // Fair (400-1000 miles) - still decent rewards
  if (distanceMiles < 1000) return Math.round(20 - (distanceMiles - 400) * 0.025); // 20 to 5
  
  // Poor (1000-3000 miles) - minimal but reasonable
  if (distanceMiles < 3000) return Math.round(5 - (distanceMiles - 1000) * 0.002); // 5 to 1
  
  // Very poor (3000+ miles) - still get something
  return Math.max(0.5, Math.round(1 - (distanceMiles - 3000) * 0.0001));
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
