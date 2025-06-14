import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Users, Play, Plus, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GAME_MODE_OPTIONS, MULTIPLAYER_CONSTANTS } from '@/types/multiplayer';
import type { MultiplayerGameSettings } from '@/types/multiplayer';
import { isValidRoomCode, isValidDisplayName, generateGuestName } from '@/utils/multiplayerUtils';

interface MultiplayerMenuProps {
  onBack: () => void;
  onCreateRoom: (roomName: string, settings: MultiplayerGameSettings, displayName: string) => void;
  onJoinRoom: (roomCode: string, displayName: string) => void;
  isLoading?: boolean;
  error?: string;
}

export default function MultiplayerMenu({ 
  onBack, 
  onCreateRoom, 
  onJoinRoom, 
  isLoading = false,
  error 
}: MultiplayerMenuProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [selectedGameMode, setSelectedGameMode] = useState<'classic' | 'blitz' | 'marathon'>('classic');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [allowSpectators, setAllowSpectators] = useState(false);
  
  const [errors, setErrors] = useState<{
    displayName?: string;
    roomCode?: string;
    roomName?: string;
  }>({});

  const handleGenerateGuestName = () => {
    const guestName = generateGuestName();
    setDisplayName(guestName);
    setErrors(prev => ({ ...prev, displayName: undefined }));
  };

  const validateDisplayName = (name: string) => {
    const validation = isValidDisplayName(name);
    if (!validation.valid) {
      setErrors(prev => ({ ...prev, displayName: validation.error }));
      return false;
    }
    setErrors(prev => ({ ...prev, displayName: undefined }));
    return true;
  };

  const validateRoomCode = (code: string) => {
    if (!isValidRoomCode(code)) {
      setErrors(prev => ({ ...prev, roomCode: 'Invalid room code format' }));
      return false;
    }
    setErrors(prev => ({ ...prev, roomCode: undefined }));
    return true;
  };

  const validateRoomName = (name: string) => {
    if (!name.trim()) {
      setErrors(prev => ({ ...prev, roomName: 'Room name is required' }));
      return false;
    }
    if (name.trim().length > 50) {
      setErrors(prev => ({ ...prev, roomName: 'Room name must be 50 characters or less' }));
      return false;
    }
    setErrors(prev => ({ ...prev, roomName: undefined }));
    return true;
  };

  const handleCreateRoom = () => {
    const displayNameValid = validateDisplayName(displayName);
    const roomNameValid = validateRoomName(roomName);
    
    if (!displayNameValid || !roomNameValid) return;
    
    const selectedMode = GAME_MODE_OPTIONS.find(mode => mode.id === selectedGameMode);
    if (!selectedMode) return;
    
    const settings: MultiplayerGameSettings = {
      ...selectedMode.settings,
      allow_spectators: allowSpectators,
      show_leaderboard_between_rounds: true
    } as MultiplayerGameSettings;
    
    onCreateRoom(roomName.trim(), settings, displayName.trim());
  };

  const handleJoinRoom = () => {
    const displayNameValid = validateDisplayName(displayName);
    const roomCodeValid = validateRoomCode(roomCode);
    
    if (!displayNameValid || !roomCodeValid) return;
    
    onJoinRoom(roomCode.toUpperCase(), displayName.trim());
  };

  const selectedModeOption = GAME_MODE_OPTIONS.find(mode => mode.id === selectedGameMode);

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-amber-800">Multiplayer Mode</h1>
              <p className="text-amber-700">Play SmrutiMap with friends!</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Main Menu Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Room Card */}
            <Card className="border-2 border-amber-200 hover:border-amber-300 transition-colors cursor-pointer"
                  onClick={() => setMode('create')}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Plus className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Create Room</CardTitle>
                    <CardDescription>Host a new multiplayer game</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Up to {MULTIPLAYER_CONSTANTS.MAX_PLAYERS_LIMIT} players</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    <span>Multiple game modes available</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {GAME_MODE_OPTIONS.map(mode => (
                      <Badge key={mode.id} variant="secondary" className="text-xs">
                        {mode.icon} {mode.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Join Room Card */}
            <Card className="border-2 border-amber-200 hover:border-amber-300 transition-colors cursor-pointer"
                  onClick={() => setMode('join')}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Join Room</CardTitle>
                    <CardDescription>Join an existing game</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>Enter a {MULTIPLAYER_CONSTANTS.ROOM_CODE_LENGTH}-digit room code to join friends</div>
                  <div className="text-xs text-gray-500">
                    Ask the host for the room code to get started
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Highlights */}
          <div className="mt-8 p-6 bg-white rounded-lg border border-amber-200">
            <h3 className="text-lg font-semibold text-amber-800 mb-4">Multiplayer Features</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Real-time Competition</h4>
                <p className="text-gray-600">Compete with friends in synchronized rounds</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Live Leaderboard</h4>
                <p className="text-gray-600">See rankings update in real-time</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Multiple Game Modes</h4>
                <p className="text-gray-600">Choose from Classic, Blitz, or Marathon modes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setMode('menu')}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-amber-800">Create Room</h1>
              <p className="text-amber-700">Set up your multiplayer game</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Room Configuration</CardTitle>
              <CardDescription>Customize your multiplayer experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Your Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => validateDisplayName(displayName)}
                    placeholder="Enter your name"
                    className={errors.displayName ? 'border-red-300' : ''}
                    maxLength={20}
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleGenerateGuestName}
                    className="whitespace-nowrap"
                  >
                    Random
                  </Button>
                </div>
                {errors.displayName && (
                  <p className="text-sm text-red-600">{errors.displayName}</p>
                )}
              </div>

              {/* Room Name */}
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onBlur={() => validateRoomName(roomName)}
                  placeholder="Enter room name"
                  className={errors.roomName ? 'border-red-300' : ''}
                  maxLength={50}
                />
                {errors.roomName && (
                  <p className="text-sm text-red-600">{errors.roomName}</p>
                )}
              </div>

              {/* Game Mode */}
              <div className="space-y-2">
                <Label>Game Mode</Label>
                <Select value={selectedGameMode} onValueChange={(value: any) => setSelectedGameMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_MODE_OPTIONS.map(mode => (
                      <SelectItem key={mode.id} value={mode.id}>
                        <div className="flex items-center gap-2">
                          <span>{mode.icon}</span>
                          <span>{mode.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedModeOption && (
                  <p className="text-sm text-gray-600">{selectedModeOption.description}</p>
                )}
              </div>

              {/* Max Players */}
              <div className="space-y-2">
                <Label>Max Players</Label>
                <Select value={maxPlayers.toString()} onValueChange={(value) => setMaxPlayers(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: MULTIPLAYER_CONSTANTS.MAX_PLAYERS_LIMIT - MULTIPLAYER_CONSTANTS.MIN_PLAYERS_TO_START + 1 }, 
                      (_, i) => MULTIPLAYER_CONSTANTS.MIN_PLAYERS_TO_START + i
                    ).map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} players
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Allow Spectators Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Allow Spectators</Label>
                  <p className="text-sm text-gray-600">Let others watch the game</p>
                </div>
                <Button
                  type="button"
                  variant={allowSpectators ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAllowSpectators(!allowSpectators)}
                >
                  {allowSpectators ? "Yes" : "No"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Create Button */}
          <div className="mt-6 flex gap-3">
            <Button 
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Creating..." : "Create Room"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setMode('menu')}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-amber-800">Join Room</h1>
              <p className="text-amber-700">Enter a room code to join</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Join Game</CardTitle>
              <CardDescription>Enter your details to join the game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="joinDisplayName">Your Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="joinDisplayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => validateDisplayName(displayName)}
                    placeholder="Enter your name"
                    className={errors.displayName ? 'border-red-300' : ''}
                    maxLength={20}
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleGenerateGuestName}
                    className="whitespace-nowrap"
                  >
                    Random
                  </Button>
                </div>
                {errors.displayName && (
                  <p className="text-sm text-red-600">{errors.displayName}</p>
                )}
              </div>

              {/* Room Code */}
              <div className="space-y-2">
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onBlur={() => validateRoomCode(roomCode)}
                  placeholder={`Enter ${MULTIPLAYER_CONSTANTS.ROOM_CODE_LENGTH}-digit code`}
                  className={`text-center font-mono text-lg tracking-wider ${errors.roomCode ? 'border-red-300' : ''}`}
                  maxLength={MULTIPLAYER_CONSTANTS.ROOM_CODE_LENGTH}
                />
                {errors.roomCode && (
                  <p className="text-sm text-red-600">{errors.roomCode}</p>
                )}
                <p className="text-xs text-gray-500">
                  Ask the host for the room code
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Join Button */}
          <div className="mt-6">
            <Button 
              onClick={handleJoinRoom}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Joining..." : "Join Room"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 