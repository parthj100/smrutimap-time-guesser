import React, { useState, useEffect } from 'react';
import { GameImage as GameImageType } from '@/types/game';
import GameImage from '../GameImage';
import MapSelector from '../MapSelector';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Target, MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import type { MultiplayerRoundResult, MultiplayerLeaderboard, RoomParticipant } from '@/types/multiplayer';

interface MultiplayerRoundResultsProps {
  roundNumber: number;
  totalRounds: number;
  currentImage: GameImageType;
  roundResults: MultiplayerRoundResult[];
  leaderboard: MultiplayerLeaderboard[];
  participants: RoomParticipant[];
  myParticipantId: string;
  isHost: boolean;
  allPlayersReady: boolean;
  onNextRound: () => void;
  onToggleReady: () => void;
  onEndGame: () => void;
}

export default function MultiplayerRoundResults({
  roundNumber,
  totalRounds,
  currentImage,
  roundResults,
  leaderboard,
  participants,
  myParticipantId,
  isHost,
  allPlayersReady,
  onNextRound,
  onToggleReady,
  onEndGame
}: MultiplayerRoundResultsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get my result for this round
  const myResult = roundResults.find(r => r.participant_id === myParticipantId);
  const myParticipant = participants.find(p => p.id === myParticipantId);
  const isReady = myParticipant?.status === 'ready';
  const isLastRound = roundNumber >= totalRounds;

  // Prepare map markers for all players
  const allGuesses = roundResults.map(result => {
    const participant = participants.find(p => p.id === result.participant_id);
    return {
      lat: result.location_guess.lat,
      lng: result.location_guess.lng,
      color: participant?.avatar_color || '#3b82f6',
      name: participant?.display_name || 'Unknown',
      score: result.total_score
    };
  });

  const formatTime = (seconds: number) => {
    return `${seconds}s`;
  };

  const getScoreColor = (score: number, maxScore: number = 10000) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-600" />
                <span className="text-xl font-bold text-gray-800">
                  Round {roundNumber} Results
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {roundNumber} of {totalRounds} rounds complete
            </div>
          </div>

          {/* Image info */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">{currentImage.year}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="h-4 w-4" />
              <span>{currentImage.location.name}</span>
            </div>
            <div className="flex-1" />
            {!isMobile && (
              <div className="flex gap-2">
                <Button
                  variant={showMap ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMap(true)}
                >
                  Map View
                </Button>
                <Button
                  variant={!showMap ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMap(false)}
                >
                  Leaderboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-8'} h-full`}>
          
          {/* Left side - Image and My Result */}
          <div className="flex flex-col">
            {/* Image */}
            <div className={`${isMobile ? 'h-48' : 'h-64'} mb-4`}>
              <GameImage 
                imageUrl={currentImage.image_url} 
                description={currentImage.description} 
                revealDescription={true}
              />
            </div>

            {/* My Result */}
            {myResult && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Result</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Year Guess</div>
                    <div className="text-xl font-bold text-gray-800">{myResult.year_guess}</div>
                    <div className="text-sm text-gray-500">
                      {Math.abs(myResult.year_guess - currentImage.year)} years off
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Total Score</div>
                    <div className={`text-2xl font-bold ${getScoreColor(myResult.total_score)}`}>
                      {myResult.total_score.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(myResult.time_taken)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span>Year Score: <span className="font-semibold">{myResult.year_score}</span></span>
                    <span>Location Score: <span className="font-semibold">{myResult.location_score}</span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Map or Leaderboard */}
          <div className="flex flex-col">
            {(showMap || isMobile) && (
              <div className={`${isMobile ? 'h-64' : 'flex-1'} mb-4`}>
                <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">All Players' Guesses</span>
                    </div>
                  </div>
                  <div className="h-full">
                    <MapSelector
                      onLocationSelected={() => {}} // Read-only
                      actualLocation={currentImage.location}
                      isDisabled={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20">
              <div className="p-6 border-b border-white/20 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">Current Standings</h3>
                    <p className="text-sm text-gray-600">Round {roundNumber} Results</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {leaderboard.slice(0, 5).map((entry, index) => {
                    const rank = index + 1;
                    const isTopThree = rank <= 3;
                    const isCurrentUser = entry.participant_id === myParticipantId;
                    
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
                        key={entry.participant_id}
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
                              {entry.display_name?.[0]?.toUpperCase() || 'U'}
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
                                {entry.display_name}
                              </h3>
                              {isCurrentUser && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">You</span>
                              )}
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{entry.rounds_completed} rounds</span>
                              <span>•</span>
                              <span>Avg: {Math.round(entry.average_score)}</span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${isTopThree ? 'text-gray-800' : 'text-gray-700'}`}>
                              {entry.total_score}
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
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">
                  {participants.filter(p => p.status === 'ready').length}/{participants.length} ready
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {!isHost && (
                <Button
                  onClick={onToggleReady}
                  variant={isReady ? "secondary" : "outline"}
                  size="lg"
                >
                  {isReady ? "Ready!" : "Mark as Ready"}
                </Button>
              )}

              {isHost && (
                <>
                  {!isLastRound ? (
                    <Button
                      onClick={onNextRound}
                      disabled={!allPlayersReady}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Next Round
                    </Button>
                  ) : (
                    <Button
                      onClick={onEndGame}
                      disabled={!allPlayersReady}
                      size="lg"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      End Game
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {isHost && !allPlayersReady && (
            <div className="mt-3 text-sm text-amber-600 text-center">
              Waiting for all players to be ready...
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 