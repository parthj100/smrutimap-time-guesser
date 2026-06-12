import React from 'react';
import { GuessResult } from '@/types/game';

interface PlayerStanding {
  userId: string;
  totalPoints: number;
  isCurrentUser: boolean;
  playerName: string;
}

interface MultiplayerFinalStandingsProps {
  /** The local player's per-round results, used to compute their own total. */
  results: GuessResult[];
  /** Number of rounds, for the per-round average display. */
  totalRounds: number;
  currentUserId?: string;
  playerNames?: Record<string, string>;
  getLeaderboard?: () => Array<{ userId: string; totalPoints: number }>;
}

const getRankIcon = (rank: number): string => `#${rank}`;

/**
 * Final standings shown on the multiplayer game-over screen. Extracted verbatim
 * from Game.tsx's inline IIFE — same inputs, same markup — with the standings
 * array now properly typed (it previously inferred `never[]`).
 */
export const MultiplayerFinalStandings: React.FC<MultiplayerFinalStandingsProps> = ({
  results,
  totalRounds,
  currentUserId,
  playerNames,
  getLeaderboard,
}) => {
  const playerScores: PlayerStanding[] = [];

  // Add the current player's score from their local game results.
  const currentPlayerTotal = results.reduce((sum, result) => {
    if (result.scaledScore !== undefined) {
      return sum + result.scaledScore;
    }
    if (result.displayYearScore !== undefined && result.displayLocationScore !== undefined) {
      return sum + result.displayYearScore + result.displayLocationScore + (result.timeBonus || 0);
    }
    return sum + (result.totalScore * 100) + (result.timeBonus || 0);
  }, 0);

  const currentUserDisplayName = playerNames?.[currentUserId || ''];
  const currentUserLabel = currentUserDisplayName ? `You (${currentUserDisplayName})` : 'You';

  playerScores.push({
    userId: currentUserId || 'current',
    totalPoints: Math.round(currentPlayerTotal),
    isCurrentUser: true,
    playerName: currentUserLabel,
  });

  // Add the other players' scores from the multiplayer leaderboard.
  const multiplayerLeaderboard = getLeaderboard?.() || [];
  multiplayerLeaderboard.forEach((entry) => {
    if (entry.userId !== currentUserId) {
      const displayName = playerNames?.[entry.userId] || `Player ${playerScores.length}`;
      playerScores.push({
        userId: entry.userId,
        totalPoints: entry.totalPoints,
        isCurrentUser: false,
        playerName: displayName,
      });
    }
  });

  playerScores.sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <>
      {playerScores.map((player, index) => (
        <div
          key={player.userId}
          className={`p-4 lg:p-6 rounded-xl border-2 ${
            player.isCurrentUser ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-gray-50 border-gray-200'
          } ${index === 0 ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''} transition-all hover:scale-[1.02]`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl lg:text-4xl">{getRankIcon(index + 1)}</span>
              <div>
                <div className="text-xl lg:text-2xl font-bold text-gray-800">
                  {player.playerName}
                  {player.isCurrentUser && <span className="text-blue-600 ml-2 text-base font-semibold">(you)</span>}
                </div>
                <div className="text-sm lg:text-base text-gray-600">
                  {index === 0 ? 'Winner!' : `${Math.round(player.totalPoints / totalRounds)} pts/round average`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl lg:text-3xl font-bold text-brand">
                {player.totalPoints}
              </div>
              <div className="text-sm lg:text-base text-gray-600">
                total points
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
