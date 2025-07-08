import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { ArrowLeft, Users, Plus, LogIn, Home } from 'lucide-react';

interface SimpleMultiplayerMenuProps {
  onBack: () => void;
  onCreateRoom: (displayName: string, settings: { rounds: number; timePerRound: number }) => Promise<{ success: boolean; error?: string }>;
  onJoinRoom: (roomCode: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  onHome: () => void;
}

export const SimpleMultiplayerMenu: React.FC<SimpleMultiplayerMenuProps> = ({ 
  onBack, 
  onCreateRoom, 
  onJoinRoom,
  onHome
}) => {
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [settings, setSettings] = useState({
    rounds: 5,
    timePerRound: 60
  });

  const handleCreateRoom = async () => {
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const result = await onCreateRoom(displayName, settings);
      if (!result.success) {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const result = await onJoinRoom(roomCode, displayName);
      if (!result.success) {
        setError(result.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-white relative">
        {/* Navigation Buttons - Fixed positioning in corners */}
        <div className="fixed top-6 left-6 z-10">
          <Button
            onClick={() => setView('menu')}
            className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="fixed top-6 right-6 z-10">
          <Button
            onClick={onHome}
            className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            <Home className="h-5 w-5 mr-2" />
            Home
          </Button>
        </div>

        {/* Centered Content */}
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-lg w-full space-y-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto">
                <Plus size={40} className="text-white" />
              </div>
              
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Let's set up your game! 🎮
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Choose your settings and we'll create a room for you and your friends
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  What should we call you? 👋
                </label>
                <Input
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
                  className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:ring-0 placeholder-gray-400"
                />
                <p className="text-sm text-gray-500 mt-2">This is how other players will see you</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    Rounds 🔄
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.rounds}
                    onChange={(e) => setSettings(prev => ({ ...prev, rounds: parseInt(e.target.value) || 5 }))}
                    className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    Time ⏱️
                  </label>
                  <Input
                    type="number"
                    min="30"
                    max="180"
                    value={settings.timePerRound}
                    onChange={(e) => setSettings(prev => ({ ...prev, timePerRound: parseInt(e.target.value) || 60 }))}
                    className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:ring-0"
                  />
                  <p className="text-sm text-gray-500 mt-1">seconds per round</p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-red-600 font-medium text-center">{error}</p>
                </div>
              )}

              <Button 
                onClick={handleCreateRoom} 
                disabled={isLoading}
                className="w-full h-16 text-xl font-bold bg-[#ea384c] hover:bg-[#d32f42] text-white rounded-2xl shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? 'Creating room...' : 'Create Room 🚀'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="min-h-screen bg-white relative">
        {/* Navigation Buttons - Fixed positioning in corners */}
        <div className="fixed top-6 left-6 z-10">
          <Button
            onClick={() => setView('menu')}
            className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="fixed top-6 right-6 z-10">
          <Button
            onClick={onHome}
            className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
          >
            <Home className="h-5 w-5 mr-2" />
            Home
          </Button>
        </div>

        {/* Centered Content */}
        <div className="flex items-center justify-center min-h-screen p-6">
          <div className="max-w-lg w-full space-y-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto">
                <LogIn size={40} className="text-white" />
              </div>
              
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Ready to join the fun? 🎉
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Enter the room code your friend shared with you
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  What should we call you? 👋
                </label>
                <Input
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
                  className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:ring-0 placeholder-gray-400"
                />
                <p className="text-sm text-gray-500 mt-2">This is how other players will see you</p>
              </div>

              <div>
                <label className="block text-lg font-semibold text-gray-900 mb-3">
                  Room Code 🔑
                </label>
                <Input
                  type="text"
                  placeholder="Enter 6-letter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="h-14 text-lg border-2 border-gray-200 rounded-2xl focus:border-[#ea384c] focus:ring-0 placeholder-gray-400 uppercase tracking-widest"
                />
                <p className="text-sm text-gray-500 mt-2">Ask your friend for the room code</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-red-600 font-medium text-center">{error}</p>
                </div>
              )}

              <Button 
                onClick={handleJoinRoom} 
                disabled={isLoading}
                className="w-full h-16 text-xl font-bold bg-[#ea384c] hover:bg-[#d32f42] text-white rounded-2xl shadow-xl transition-all hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? 'Joining room...' : 'Join Room 🎮'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Navigation Buttons - Fixed positioning in corners */}
      <div className="fixed top-6 left-6 z-10">
        <Button
          onClick={onBack}
          className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>
      
      <div className="fixed top-6 right-6 z-10">
        <Button
          onClick={onHome}
          className="bg-[#ea384c] hover:bg-[#d32f42] text-white px-6 py-3 rounded-xl text-lg font-bold shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
        >
          <Home className="h-5 w-5 mr-2" />
          Home
        </Button>
      </div>

      {/* Centered Content */}
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-[#ea384c] rounded-full flex items-center justify-center mx-auto">
              <Users size={40} className="text-white" />
            </div>
            
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Let's play together! 🌍
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Challenge your friends to guess when and where photos were taken from around the world
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setView('create')}
              className="group w-full p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-[#ea384c] hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">🎮</span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#ea384c] transition-colors">
                    Create a Room
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Start a new game and invite friends with a room code
                  </p>
                </div>
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-[#ea384c] transition-colors" />
              </div>
            </button>

            <button
              onClick={() => setView('join')}
              className="group w-full p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-[#ea384c] hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">🔑</span>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#ea384c] transition-colors">
                    Join a Room
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Enter a room code to join an existing game
                  </p>
                </div>
                <LogIn className="w-6 h-6 text-gray-400 group-hover:text-[#ea384c] transition-colors" />
              </div>
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-500 text-sm">
              💡 Tip: You can play with friends anywhere in the world!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 