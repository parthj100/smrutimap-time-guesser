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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Overall Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overallLeaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === currentUserId;
                  
                  return (
                    <div 
                      key={entry.userId}
                      className={`p-3 rounded-lg border ${
                        isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getRankIcon(index + 1)}</span>
                          <div>
                            <div className="font-medium">
                              {getUserDisplayName(entry.userId)}
                              {isCurrentUser && <span className="text-blue-600 ml-1">(You)</span>}
                            </div>
                            <div className="text-xs text-gray-600">
                              Avg: {entry.averagePoints} pts/round
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {entry.totalPoints}
                          </div>
                          <div className="text-xs text-gray-600">
                            {entry.roundsPlayed}/{totalRounds} rounds
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