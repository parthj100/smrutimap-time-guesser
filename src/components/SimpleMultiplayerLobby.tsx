import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Users, Clock, Play, Crown, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SimpleRoom {
  id: string;
  room_code: string;
  host_user_id: string;
  current_round: number;
  total_rounds: number;
  time_per_round: number;
  game_status: 'waiting' | 'playing' | 'finished';
}

interface SimpleMultiplayerLobbyProps {
  room: SimpleRoom;
  participants: string[]; // Array of user IDs who are connected
  playerNames: Record<string, string>; // Map of user ID to display name
  isHost: boolean;
  onBack: () => void;
  onStartGame: () => Promise<{ success: boolean; error?: string }>;
  onLeaveRoom: () => void;
  onHome: () => void; // Add home navigation
}

export const SimpleMultiplayerLobby: React.FC<SimpleMultiplayerLobbyProps> = ({ 
  room, 
  participants,
  playerNames,
  isHost, 
  onBack, 
  onStartGame,
  onLeaveRoom,
  onHome
}) => {
  const { user } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const handleStartGame = async () => {
    console.log('🚀 Attempting to start game...', { isHost, participantCount: participants.length });
    
    setIsStarting(true);
    setError('');
    
    try {
      const result = await onStartGame();
      console.log('🎮 Start game result:', result);
      
      if (!result.success) {
        setError(result.error || 'Failed to start game');
        setIsStarting(false);
      }
      // If successful, the game state will change and this component will unmount
    } catch (err) {
      console.error('❌ Error starting game:', err);
      setError('Unexpected error occurred');
      setIsStarting(false);
    }
  };

  const handleLeave = () => {
    onLeaveRoom();
    onBack();
  };

  const handleHome = () => {
    onLeaveRoom();
    onHome();
  };

  // If game starts, this component should no longer be shown
  useEffect(() => {
    if (room.game_status === 'playing') {
      console.log('🎮 Game started! Transitioning to game view...');
    }
  }, [room.game_status]);

  // Debug participant count
  useEffect(() => {
    console.log('🏠 Lobby participants debug:', {
      participants,
      participantCount: participants.length,
      isHost,
      canStartGame: participants.length >= 2,
      buttonDisabled: isStarting || participants.length < 2
    });
  }, [participants, isHost, isStarting]);

  // Prefer database player list for lobby display to avoid presence sync edge-cases
  const displayedParticipantIds = Object.keys(playerNames).length > 0 
    ? Object.keys(playerNames) 
    : participants;

  return (
    <div className="min-h-screen bg-white relative">
      {/* Navigation Buttons - Fixed positioning in corners */}
      <div className="fixed top-6 left-6 z-10">
        <Button
          onClick={handleLeave}
          className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>
      
      <div className="fixed top-6 right-6 z-10">
        <Button
          onClick={handleHome}
          className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <Home className="h-5 w-5 mr-2" />
          Home
        </Button>
      </div>

      {/* Centered Content */}
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-lg w-full space-y-8">
          {/* Room Info */}
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto">
              <Users size={40} className="text-white" />
            </div>
            
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Welcome to your room! 🎮
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Share the room code with friends to start playing together
              </p>
              
              {/* Room Code Display */}
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-300">
                <p className="text-sm text-gray-600 mb-3">Room Code</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl font-bold font-mono tracking-widest text-[#ea384c] bg-white px-6 py-3 rounded-xl border-2 border-gray-200">
                    {room.room_code}
                  </span>
                  <Button
                    onClick={copyRoomCode}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-gray-100"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Game Settings: {room.total_rounds} rounds • {room.time_per_round}s per round
                </p>
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 text-center">
              Players ({displayedParticipantIds.length}) 👥
            </h3>
            <div className="space-y-3">
              {displayedParticipantIds.map((participantId, index) => {
                const isCurrentUser = participantId === user?.id;
                const isRoomHost = participantId === room.host_user_id;
                const displayName = playerNames[participantId] || `Player ${index + 1}`;
                
                return (
                  <div key={participantId} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                    <div className="w-12 h-12 bg-[#ea384c] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {isCurrentUser ? `You (${displayName})` : displayName}
                        {isRoomHost && <span className="text-yellow-500 ml-2 text-xl">👑</span>}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isRoomHost ? 'Host' : 'Player'}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      Online
                    </Badge>
                  </div>
                );
              })}
              
              {displayedParticipantIds.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">No players connected</p>
                </div>
              )}
            </div>
          </div>

          {/* Host Status & Controls */}
          {isHost && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Crown className="h-6 w-6 text-yellow-500" />
                <span className="text-lg font-semibold text-gray-900">You're the host!</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-600 font-medium text-center">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {isHost ? (
              <Button 
                onClick={handleStartGame} 
                disabled={isStarting || displayedParticipantIds.length < 1}
                className="w-full h-16 text-xl font-bold bg-[#ea384c] hover:bg-[#d32f42] text-white rounded-xl shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {isStarting ? (
                  'Starting game...'
                ) : displayedParticipantIds.length < 1 ? (
                  <>
                    <Users className="h-6 w-6 mr-3" />
                    Waiting for players... ({displayedParticipantIds.length}/1)
                  </>
                ) : (
                  <>
                    <Play className="h-6 w-6 mr-3" />
                    Start Game! ({displayedParticipantIds.length} players) 🚀
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <Clock className="h-12 w-12 text-[#ea384c] mx-auto mb-3" />
                </div>
                <p className="text-gray-600 text-lg">
                  Waiting for host to start the game...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 