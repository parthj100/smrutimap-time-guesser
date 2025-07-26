import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Target, Users } from 'lucide-react';

interface RoundResult {
  userId: string;
  points: number;
  guessedYear: number;
  actualYear: number;
  timeUsed: number;
}

interface LeaderboardEntry {
  userId: string;
  totalPoints: number;
  roundsPlayed: number;
  averagePoints: number;
}

interface SimpleMultiplayerRoundResultsProps {
  roundNumber: number;
  totalRounds: number;
  roundResults: RoundResult[];
  overallLeaderboard: LeaderboardEntry[];
  currentUserId: string;
  onNextRound: () => void;
  onViewFinalResults: () => void;
  isLastRound: boolean;
  isHost: boolean;
}

export const SimpleMultiplayerRoundResults: React.FC<SimpleMultiplayerRoundResultsProps> = ({
  roundNumber,
  totalRounds,
  roundResults,
  overallLeaderboard,
  currentUserId,
  onNextRound,
  onViewFinalResults,
  isLastRound,
  isHost
}) => {
  const getUserDisplayName = (userId: string) => {
    if (userId === currentUserId) return 'You';
    const index = roundResults.findIndex(r => r.userId === userId);
    return `Player ${index + 1}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">Round {roundNumber} Results</h1>
          <p className="text-xl opacity-90">
            {isLastRound ? 'Final Round Complete!' : `${totalRounds - roundNumber} rounds remaining`}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Round Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Round {roundNumber} Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roundResults.map((result, index) => {
                  const isCurrentUser = result.userId === currentUserId;
                  const accuracy = Math.max(0, 1000 - Math.abs(result.guessedYear - result.actualYear));
                  
                  return (
                    <div 
                      key={result.userId}
                      className={`p-3 rounded-lg border ${
                        isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getRankIcon(index + 1)}</span>
                          <span className="font-medium">
                            {getUserDisplayName(result.userId)}
                          </span>
                          {isCurrentUser && <Badge variant="outline">You</Badge>}
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          {result.points} pts
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <div className="font-medium">Guess</div>
                          <div>{result.guessedYear}</div>
                        </div>
                        <div>
                          <div className="font-medium">Actual</div>
                          <div>{result.actualYear}</div>
                        </div>
                        <div>
                          <div className="font-medium">Time</div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {result.timeUsed}s
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Overall Leaderboard */}
          <Card className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20">
            <CardHeader className="p-6 border-b border-white/20 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Overall Leaderboard</h3>
                  <p className="text-sm text-gray-600">Round {roundNumber} Results</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {overallLeaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;
                  const isCurrentUser = entry.userId === currentUserId;
                  
                  // Color schemes for different ranks (matching main leaderboard)
                  const getCardColors = () => {
                    if (rank === 1) return {
                      card: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 shadow-xl shadow-yellow-100/50',
                      avatar: 'bg-gradient-to-br from-yellow-400 to-amber-500',
                      badge: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
                      rankIcon: '👑'
                    };
                    if (rank === 2) return {
                      card: 'bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-200 shadow-xl shadow-slate-100/50',
                      avatar: 'bg-gradient-to-br from-slate-400 to-gray-500',
                      badge: 'bg-gradient-to-r from-slate-400 to-gray-500 text-white',
                      rankIcon: '🥈'
                    };
                    if (rank === 3) return {
                      card: 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 shadow-xl shadow-orange-100/50',
                      avatar: 'bg-gradient-to-br from-orange-400 to-amber-600',
                      badge: 'bg-gradient-to-r from-orange-400 to-amber-600 text-white',
                      rankIcon: '🥉'
                    };
                    return {
                      card: isCurrentUser 
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-xl shadow-blue-100/50'
                        : 'bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-0',
                      avatar: isCurrentUser 
                        ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                        : 'bg-gradient-to-br from-gray-400 to-gray-500',
                      badge: isCurrentUser
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                        : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
                      rankIcon: rank.toString()
                    };
                  };

                  const colors = getCardColors();

                  return (
                    <div
                      key={entry.userId}
                      className={`relative p-4 rounded-2xl transition-all duration-0 group hover:scale-105 ${colors.card}`}
                    >
                      {/* Rank Badge */}
                      <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${colors.badge} flex items-center justify-center text-sm font-bold shadow-lg z-10`}>
                        {isTopThree ? colors.rankIcon : rank}
                      </div>

                      {/* Card Content */}
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative">
                          <div className={`w-16 h-16 rounded-full ${colors.avatar} flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-xl transition-all duration-0`}>
                            {getUserDisplayName(entry.userId)?.[0]?.toUpperCase() || 'U'}
                          </div>
                          {isCurrentUser && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
                              <span className="text-xs text-white font-bold">U</span>
                            </div>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-base leading-tight">
                              {getUserDisplayName(entry.userId)}
                            </h3>
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">You</span>
                            )}
                          </div>
                          
                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Avg: {entry.averagePoints} pts/round</span>
                            <span>•</span>
                            <span>{entry.roundsPlayed}/{totalRounds} rounds</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${isTopThree ? 'text-gray-800' : 'text-gray-700'}`}>
                            {entry.totalPoints}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            points
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          {isHost ? (
            <Button
              onClick={isLastRound ? onViewFinalResults : onNextRound}
              size="lg"
              className="px-8"
            >
              {isLastRound ? (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  View Final Results
                </>
              ) : (
                'Start Next Round'
              )}
            </Button>
          ) : (
            <div className="text-center text-white">
              <div className="animate-pulse text-lg">
                {isLastRound ? 'Waiting for final results...' : 'Waiting for host to start next round...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 