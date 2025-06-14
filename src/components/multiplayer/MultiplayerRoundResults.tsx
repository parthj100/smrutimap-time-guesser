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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-gray-800">Current Standings</span>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div
                      key={entry.participant_id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        entry.participant_id === myParticipantId 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-300 text-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.avatar_color }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {entry.display_name}
                          {entry.participant_id === myParticipantId && (
                            <span className="text-xs text-blue-600 ml-1">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.rounds_completed} rounds • Avg: {Math.round(entry.average_score)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">
                          {entry.total_score.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
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