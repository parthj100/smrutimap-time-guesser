export interface GameImage {
  id: string;
  image_url: string;
  year: number;
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  description: string;
}

export interface GuessResult {
  imageId: string;
  imageUrl?: string; // Store the actual image URL
  yearGuess: number;
  locationGuess: {
    lat: number;
    lng: number;
  };
  actualYear?: number;
  actualLocation?: {
    lat: number;
    lng: number;
    name?: string;
  };
  yearScore: number; // Raw score (0-100)
  locationScore: number; // Raw score (0-100)
  totalScore: number; // Raw score (0-100)
  scaledScore?: number; // Scaled score (0-10000+) for display consistency
  timeUsed?: number; // Time used for this round in seconds
  // New display score fields for consistent UI usage
  displayYearScore?: number; // Display score (0-5000)
  displayLocationScore?: number; // Display score (0-5000)
  timeBonus?: number; // Time bonus points
}

export interface GameState {
  currentRound: number;
  totalRounds: number;
  currentImage: GameImage | null;
  results: GuessResult[];
  isGuessing: boolean;
  hasGuessed: boolean;
  gameOver: boolean;
  usedImageIds: string[]; // Track used image IDs to prevent repeats
  isTimedMode: boolean;
  timerType: 'per-round' | 'total-game';
  timeRemaining: number; // in seconds
  timerActive: boolean;
  gameStartTime?: number; // timestamp when game started
  roundStartTime?: number; // timestamp when current round started
  customTimerDuration?: number; // custom timer duration for multiplayer games
}

// User Profile Types
export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  center?: string;
  created_at: string;
  updated_at: string;
  total_games_played: number;
  total_score: number;
  best_single_game_score: number;
  average_score: number;
  favorite_game_mode: 'random' | 'daily' | 'timed';
}

// Game Session Types
export type GameMode = 'random' | 'daily' | 'timed';

export interface GameSession {
  id: string;
  user_id: string;
  game_mode: GameMode;
  total_score: number;
  rounds_completed: number;
  time_taken?: number; // Total time in seconds
  completed_at: string;
  created_at: string;
}

// Round Result Types (for detailed analytics)
export interface RoundResult {
  id: string;
  session_id: string;
  user_id: string;
  image_id: string;
  round_number: number;
  year_guess: number;
  actual_year: number;
  location_guess_lat: number;
  location_guess_lng: number;
  actual_location_lat: number;
  actual_location_lng: number;
  year_score: number;
  location_score: number;
  total_round_score: number;
  time_used?: number;
  created_at: string;
}

// Leaderboard Types
export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  center?: string;
  total_games_played: number;
  total_score: number;
  best_single_game_score: number;
  average_score: number;
  best_daily_score: number;
  games_this_week: number;
  score_this_week: number;
  games_this_month: number;
  score_this_month: number;
}

export interface LeaderboardFilters {
  timeframe: 'all-time' | 'monthly' | 'weekly' | 'daily';
  gameMode: 'all' | 'random' | 'daily' | 'timed';
  metric: 'total_score' | 'average_score' | 'best_single_game' | 'games_played';
}

// Authentication Types
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}
