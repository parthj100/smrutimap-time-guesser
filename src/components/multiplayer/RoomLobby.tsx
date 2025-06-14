import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Crown, 
  Clock, 
  Settings, 
  Copy, 
  CheckCircle, 
  Circle,
  ArrowLeft,
  Play,
  AlertCircle
} from 'lucide-react';
import { GAME_MODE_OPTIONS, MULTIPLAYER_CONSTANTS } from '@/types/multiplayer';
import type { MultiplayerRoom, RoomParticipant, MultiplayerGameSettings } from '@/types/multiplayer';
import { formatTimeRemaining } from '@/utils/multiplayerUtils';

interface RoomLobbyProps {
  room: MultiplayerRoom;
  participants: RoomParticipant[];
  myParticipantId: string;
  isHost: boolean;
  isConnected: boolean;
  canStartGame: boolean;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  error?: string;
}

export default function RoomLobby({
  room,
  participants,
  myParticipantId,
  isHost,
  isConnected,
  canStartGame,
  onLeaveRoom,
  onToggleReady,
  onStartGame,
  error
}: RoomLobbyProps) {
  const [showRoomCode, setShowRoomCode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const myParticipant = participants.find(p => p.id === myParticipantId);
  const isReady = myParticipant?.status === 'ready';
  
  // Count both players and hosts as they can both play the game
  const activePlayers = participants.filter(p => p.role === 'player' || p.role === 'host');
  const readyCount = activePlayers.filter(p => p.status === 'ready').length;
  const totalPlayers = activePlayers.length;
  
  const gameMode = GAME_MODE_OPTIONS.find(mode => mode.id === room.settings.game_mode);

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const getParticipantStatusIcon = (participant: RoomParticipant) => {
    if (!isConnected) return <Circle className="h-4 w-4 text-gray-400" />;
    
    switch (participant.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connected':
        return <Circle className="h-4 w-4 text-yellow-500" />;
      case 'disconnected':
        return <Circle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onLeaveRoom}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-amber-800">{room.name}</h1>
              <p className="text-amber-700">Waiting for players...</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Room Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Room Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Room Code */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Room Code</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRoomCode(!showRoomCode)}
                      className="h-6 px-2 text-xs"
                    >
                      {showRoomCode ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`font-mono text-lg tracking-wider p-2 bg-gray-100 rounded ${showRoomCode ? '' : 'blur-sm'}`}>
                      {room.code}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyRoomCode}
                      className="h-10 w-10 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {copySuccess && (
                    <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                  )}
                </div>

                {/* Game Mode */}
                <div>
                  <span className="text-sm font-medium">Game Mode</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg">{gameMode?.icon}</span>
                    <div>
                      <div className="font-medium">{gameMode?.name}</div>
                      <div className="text-xs text-gray-600">{gameMode?.description}</div>
                    </div>
                  </div>
                </div>

                {/* Game Settings */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Settings</span>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Rounds:</span>
                      <span>{room.settings.rounds_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time per round:</span>
                      <span>
                        {room.settings.time_per_round === 0 
                          ? 'Unlimited' 
                          : formatTimeRemaining(room.settings.time_per_round)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max players:</span>
                      <span>{room.max_players}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spectators:</span>
                      <span>{room.settings.allow_spectators ? 'Allowed' : 'Not allowed'}</span>
                    </div>
                  </div>
                </div>

                {/* Ready Status */}
                <div>
                  <span className="text-sm font-medium">Ready Status</span>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Players ready:</span>
                      <span className="font-medium">{readyCount}/{totalPlayers}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: totalPlayers > 0 ? `${(readyCount / totalPlayers) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Players List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Players ({participants.length}/{room.max_players})
                  </CardTitle>
                  {totalPlayers >= MULTIPLAYER_CONSTANTS.MIN_PLAYERS_TO_START && (
                    <Badge variant="secondary" className="text-xs">
                      Ready to start!
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {totalPlayers < MULTIPLAYER_CONSTANTS.MIN_PLAYERS_TO_START && (
                    `Need ${MULTIPLAYER_CONSTANTS.MIN_PLAYERS_TO_START - totalPlayers} more player(s) to start`
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        participant.id === myParticipantId 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: participant.avatar_color }}
                        >
                          {participant.display_name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Name and Role */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{participant.display_name}</span>
                            {participant.role === 'host' && (
                              <Crown className="h-4 w-4 text-yellow-500" />
                            )}
                            {participant.id === myParticipantId && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {participant.role} • {participant.status}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {getParticipantStatusIcon(participant)}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty Slots */}
                  {room.current_players < room.max_players && (
                    <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Waiting for more players...</p>
                        <p className="text-xs mt-1">Share the room code: <span className="font-mono font-bold">{room.code}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center">
          {isHost ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3">
                <Button
                  onClick={onToggleReady}
                  disabled={!isConnected}
                  variant={isReady ? "secondary" : "outline"}
                  size="lg"
                  className="px-6"
                >
                  {isReady ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Ready!
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5 mr-2" />
                      Mark as Ready
                    </>
                  )}
                </Button>
                <Button
                  onClick={onStartGame}
                  disabled={!canStartGame || !isConnected}
                  size="lg"
                  className="px-8"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Game
                </Button>
              </div>
              {!canStartGame && (
                <p className="text-sm text-gray-600 text-center">
                  {totalPlayers < MULTIPLAYER_CONSTANTS.MIN_PLAYERS_TO_START 
                    ? 'Need more players' 
                    : 'All players must be ready to start'
                  }
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={onToggleReady}
                disabled={!isConnected}
                variant={isReady ? "secondary" : "default"}
                size="lg"
                className="px-8"
              >
                {isReady ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Ready!
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Mark as Ready
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-600 text-center">
                {isReady 
                  ? 'Waiting for host to start the game...' 
                  : 'Click "Mark as Ready" when you\'re ready to play!'
                }
              </p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-amber-200">
          <h3 className="font-medium text-amber-800 mb-2">How to Play Multiplayer</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• All players see the same historical image at the same time</p>
            <p>• Guess the year and location as accurately as possible</p>
            <p>• Earn points based on accuracy and speed</p>
            <p>• The player with the highest total score wins!</p>
          </div>
        </div>
      </div>
    </div>
  );
} 