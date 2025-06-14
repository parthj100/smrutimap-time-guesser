import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameImage as GameImageType } from '@/types/game';
import GameImage from '../GameImage';
import MapSelector from '../MapSelector';
import { Button } from '@/components/ui/button';
import { Clock, Users, Trophy, Send } from 'lucide-react';
import { toast } from "sonner";
import { GAME_CONSTANTS } from '@/constants/gameConstants';
import type { RoomParticipant, MultiplayerGameSession } from '@/types/multiplayer';

interface MultiplayerGameInterfaceProps {
  session: MultiplayerGameSession;
  participants: RoomParticipant[];
  currentImage: GameImageType;
  myParticipantId: string;
  timeRemaining: number;
  submittedParticipants: string[]; // Array of participant IDs who have submitted
  onSubmitGuess: (yearGuess: number, locationGuess: { lat: number; lng: number }) => void;
  onBack: () => void;
}

export default function MultiplayerGameInterface({
  session,
  participants,
  currentImage,
  myParticipantId,
  timeRemaining,
  submittedParticipants,
  onSubmitGuess,
  onBack
}: MultiplayerGameInterfaceProps) {
  const [yearGuess, setYearGuess] = useState<number>(GAME_CONSTANTS.YEAR_RANGE.DEFAULT);
  const [locationGuess, setLocationGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if current user has submitted
  useEffect(() => {
    setHasSubmitted(submittedParticipants.includes(myParticipantId));
  }, [submittedParticipants, myParticipantId]);

  // Format time remaining
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle guess submission
  const handleSubmitGuess = useCallback(() => {
    if (!locationGuess) {
      toast.error("Please select a location on the map before submitting!");
      return;
    }

    if (hasSubmitted) {
      toast.info("You have already submitted your guess for this round!");
      return;
    }

    onSubmitGuess(yearGuess, locationGuess);
    setHasSubmitted(true);
    toast.success("Guess submitted! Waiting for other players...");
  }, [yearGuess, locationGuess, hasSubmitted, onSubmitGuess]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeRemaining <= 0 && !hasSubmitted && locationGuess) {
      handleSubmitGuess();
    }
  }, [timeRemaining, hasSubmitted, locationGuess, handleSubmitGuess]);

  const canSubmit = locationGuess && !hasSubmitted && timeRemaining > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} size="sm">
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-gray-800">
                Round {session.current_round} of {session.total_rounds}
              </span>
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-lg ${
            timeRemaining <= 10 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeRemaining)}
          </div>

          {/* Players status */}
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600" />
            <span className="text-sm text-gray-600">
              {submittedParticipants.length}/{participants.length} submitted
            </span>
          </div>
        </div>
      </div>

      {/* Main game content */}
      <div className="flex-1 p-4 max-w-7xl mx-auto w-full">
        <div className={`${isMobile ? 'flex flex-col gap-4 h-full' : 'grid grid-cols-2 gap-8 h-full'}`}>
          
          {/* Left side - Image and Year Selector */}
          <div className="flex flex-col">
            {/* Image */}
            <div className={`${isMobile ? 'h-64' : 'flex-1'} mb-4`}>
              <GameImage 
                imageUrl={currentImage.image_url} 
                description={currentImage.description} 
                revealDescription={false}
              />
            </div>

            {/* Year Selector */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  When do you think this photo was taken?
                </label>
                <div 
                  className="bg-[#ea384c] text-white py-3 px-6 text-center rounded-xl flex items-center justify-center shadow-lg border-2 border-red-600" 
                  style={{ height: '60px' }}
                >
                  <div className="text-3xl font-bold">{yearGuess}</div>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min={GAME_CONSTANTS.YEAR_RANGE.MIN}
                  max={GAME_CONSTANTS.YEAR_RANGE.MAX}
                  value={yearGuess}
                  onChange={(e) => setYearGuess(parseInt(e.target.value))}
                  disabled={hasSubmitted}
                  className="w-full h-3 appearance-none bg-gray-200 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ 
                    background: hasSubmitted ? '#e5e7eb' : `linear-gradient(to right, #ea384c ${((yearGuess - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100)}%, #ccc ${((yearGuess - GAME_CONSTANTS.YEAR_RANGE.MIN) / (GAME_CONSTANTS.YEAR_RANGE.MAX - GAME_CONSTANTS.YEAR_RANGE.MIN) * 100)}%)`,
                  }}
                />
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>{GAME_CONSTANTS.YEAR_RANGE.MIN}</span>
                  <span>{GAME_CONSTANTS.YEAR_RANGE.MAX}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Map and Submit */}
          <div className="flex flex-col">
            {/* Map */}
            <div className={`${isMobile ? 'h-64' : 'flex-1'} mb-4`}>
              <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <MapSelector
                  onLocationSelected={(lat, lng) => setLocationGuess({ lat, lng })}
                  guessedLocation={locationGuess}
                  isDisabled={hasSubmitted}
                />
              </div>
            </div>

            {/* Submit button and status */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              {!hasSubmitted ? (
                <Button
                  onClick={handleSubmitGuess}
                  disabled={!canSubmit}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
                  size="lg"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Submit Guess
                </Button>
              ) : (
                <div className="text-center">
                  <div className="bg-green-100 text-green-800 py-3 px-4 rounded-lg mb-3">
                    ✅ Guess submitted! Waiting for other players...
                  </div>
                  <div className="text-sm text-gray-600">
                    {submittedParticipants.length}/{participants.length} players have submitted
                  </div>
                </div>
              )}

              {/* Player status indicators */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Players:</div>
                <div className="flex flex-wrap gap-2">
                  {participants.map((participant) => {
                    const hasParticipantSubmitted = submittedParticipants.includes(participant.id);
                    return (
                      <div
                        key={participant.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                          hasParticipantSubmitted
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: participant.avatar_color }}
                        />
                        <span>{participant.display_name}</span>
                        {participant.id === myParticipantId && (
                          <span className="text-xs">(You)</span>
                        )}
                        {hasParticipantSubmitted && (
                          <span>✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 