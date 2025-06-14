import { AVATAR_COLORS, MULTIPLAYER_CONSTANTS } from '@/types/multiplayer';
import type { MultiplayerRoundResult, MultiplayerLeaderboard, RoomParticipant } from '@/types/multiplayer';
import { calculateDistance } from './gameUtils';

/**
 * Generate a unique 6-digit room code
 */
export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < MULTIPLAYER_CONSTANTS.ROOM_CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Validate room code format
 */
export const isValidRoomCode = (code: string): boolean => {
  const pattern = new RegExp(`^[A-Z0-9]{${MULTIPLAYER_CONSTANTS.ROOM_CODE_LENGTH}}$`);
  return pattern.test(code.toUpperCase());
};

/**
 * Generate a random avatar color for a participant
 */
export const getRandomAvatarColor = (excludeColors: string[] = []): string => {
  const availableColors = AVATAR_COLORS.filter(color => !excludeColors.includes(color));
  if (availableColors.length === 0) {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }
  return availableColors[Math.floor(Math.random() * availableColors.length)];
};

/**
 * Get used avatar colors from participants list
 */
export const getUsedAvatarColors = (participants: RoomParticipant[]): string[] => {
  return participants.map(p => p.avatar_color);
};

/**
 * Calculate multiplayer round score with time bonus
 */
export const calculateMultiplayerScore = (
  yearGuess: number,
  locationGuess: { lat: number; lng: number },
  actualYear: number,
  actualLocation: { lat: number; lng: number },
  timeTaken: number,
  maxTime: number,
  scoringSystem: 'standard' | 'competitive' = 'standard'
): {
  yearScore: number;
  locationScore: number;
  timeBonus: number;
  totalScore: number;
} => {
  // Year scoring (0-5000 points)
  const yearDiff = Math.abs(yearGuess - actualYear);
  let yearScore = Math.max(0, 5000 - (yearDiff * 50));
  
  // Location scoring (0-5000 points)
  const distance = calculateDistance(
    locationGuess.lat, locationGuess.lng,
    actualLocation.lat, actualLocation.lng
  );
  let locationScore = Math.max(0, 5000 - (distance * 2));
  
  // Time bonus (0-1000 points for standard, 0-2000 for competitive)
  const maxBonus = scoringSystem === 'competitive' ? 2000 : 1000;
  const timeRatio = maxTime > 0 ? Math.max(0, (maxTime - timeTaken) / maxTime) : 0;
  const timeBonus = Math.floor(timeRatio * maxBonus);
  
  // Competitive mode adjustments
  if (scoringSystem === 'competitive') {
    yearScore *= 1.2; // 20% bonus for accuracy
    locationScore *= 1.2;
  }
  
  const totalScore = Math.floor(yearScore + locationScore + timeBonus);
  
  return {
    yearScore: Math.floor(yearScore),
    locationScore: Math.floor(locationScore),
    timeBonus,
    totalScore
  };
};

/**
 * Calculate leaderboard from round results
 */
export const calculateLeaderboard = (
  participants: RoomParticipant[],
  roundResults: MultiplayerRoundResult[]
): MultiplayerLeaderboard[] => {
  const participantStats = new Map<string, {
    total_score: number;
    rounds_completed: number;
    display_name: string;
    avatar_color: string;
    is_ready: boolean;
  }>();
  
  // Initialize stats for all participants
  participants.forEach(participant => {
    participantStats.set(participant.id, {
      total_score: 0,
      rounds_completed: 0,
      display_name: participant.display_name,
      avatar_color: participant.avatar_color,
      is_ready: participant.status === 'ready'
    });
  });
  
  // Aggregate scores from round results
  roundResults.forEach(result => {
    const stats = participantStats.get(result.participant_id);
    if (stats) {
      stats.total_score += result.total_score;
      stats.rounds_completed += 1;
    }
  });
  
  // Convert to leaderboard format and sort
  const leaderboard: MultiplayerLeaderboard[] = Array.from(participantStats.entries()).map(
    ([participant_id, stats]) => ({
      participant_id,
      display_name: stats.display_name,
      avatar_color: stats.avatar_color,
      total_score: stats.total_score,
      rounds_completed: stats.rounds_completed,
      average_score: stats.rounds_completed > 0 ? stats.total_score / stats.rounds_completed : 0,
      position: 0, // Will be set after sorting
      is_ready: stats.is_ready
    })
  );
  
  // Sort by total score (descending) and assign positions
  leaderboard.sort((a, b) => b.total_score - a.total_score);
  leaderboard.forEach((entry, index) => {
    entry.position = index + 1;
  });
  
  return leaderboard;
};

/**
 * Check if all players are ready to start
 */
export const areAllPlayersReady = (participants: RoomParticipant[]): boolean => {
  // Count both players and hosts as they can both play the game
  const activePlayers = participants.filter(p => p.role === 'player' || p.role === 'host');
  const readyPlayers = activePlayers.filter(p => p.status === 'ready');
  
  return activePlayers.length >= MULTIPLAYER_CONSTANTS.MIN_PLAYERS_TO_START &&
         readyPlayers.length === activePlayers.length;
};

/**
 * Get next host when current host leaves
 */
export const findNextHost = (participants: RoomParticipant[], currentHostId: string): RoomParticipant | null => {
  const eligibleHosts = participants.filter(p => 
    p.id !== currentHostId && 
    p.role === 'player' && 
    p.status === 'connected'
  );
  
  if (eligibleHosts.length === 0) return null;
  
  // Prioritize by join time (earliest first)
  return eligibleHosts.sort((a, b) => 
    new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  )[0];
};

/**
 * Generate display name suggestions for guest users
 */
export const generateGuestName = (): string => {
  const adjectives = [
    'Quick', 'Smart', 'Clever', 'Swift', 'Sharp', 'Bright', 'Fast', 'Wise',
    'Bold', 'Cool', 'Epic', 'Super', 'Mega', 'Ultra', 'Prime', 'Elite'
  ];
  
  const nouns = [
    'Explorer', 'Guesser', 'Hunter', 'Seeker', 'Finder', 'Detective', 'Scholar',
    'Traveler', 'Navigator', 'Observer', 'Historian', 'Adventurer', 'Sleuth'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${adjective}${noun}${number}`;
};

/**
 * Format time remaining for display
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Check if room can accommodate more players
 */
export const canJoinRoom = (currentPlayers: number, maxPlayers: number): boolean => {
  return currentPlayers < maxPlayers && currentPlayers < MULTIPLAYER_CONSTANTS.MAX_PLAYERS_LIMIT;
};

/**
 * Validate display name
 */
export const isValidDisplayName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Display name is required' };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, error: 'Display name must be at least 2 characters' };
  }
  
  if (name.trim().length > 20) {
    return { valid: false, error: 'Display name must be 20 characters or less' };
  }
  
  // Check for inappropriate characters
  const validPattern = /^[a-zA-Z0-9\s._-]+$/;
  if (!validPattern.test(name.trim())) {
    return { valid: false, error: 'Display name contains invalid characters' };
  }
  
  return { valid: true };
};

/**
 * Calculate submission progress for round
 */
export const getSubmissionProgress = (
  participants: RoomParticipant[],
  roundResults: MultiplayerRoundResult[],
  currentRound: number
): {
  submitted: number;
  total: number;
  percentage: number;
  submittedParticipants: string[];
} => {
  const activePlayers = participants.filter(p => p.role === 'player' && p.status === 'connected');
  const submittedParticipants = roundResults
    .filter(r => r.round_number === currentRound)
    .map(r => r.participant_id);
  
  const submitted = submittedParticipants.length;
  const total = activePlayers.length;
  const percentage = total > 0 ? (submitted / total) * 100 : 0;
  
  return {
    submitted,
    total,
    percentage,
    submittedParticipants
  };
};

/**
 * Generate channel names for Supabase realtime
 */
export const generateChannelNames = (roomId: string, sessionId?: string) => ({
  room: `room:${roomId}`,
  game: sessionId ? `game:${sessionId}` : `game:${roomId}`,
  chat: `chat:${roomId}`
});

/**
 * Debounce function for real-time updates
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}; 