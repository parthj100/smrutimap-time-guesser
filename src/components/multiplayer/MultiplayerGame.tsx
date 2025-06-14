import { useState, useEffect } from 'react';
import MultiplayerMenu from './MultiplayerMenu';
import RoomLobby from './RoomLobby';
import MultiplayerGameInterface from './MultiplayerGameInterface';
import MultiplayerRoundResults from './MultiplayerRoundResults';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { supabase } from '@/integrations/supabase/client';
import type { MultiplayerGameSettings } from '@/types/multiplayer';
import type { GameImage as GameImageType } from '@/types/game';
import { areAllPlayersReady } from '@/utils/multiplayerUtils';
import { transformDatabaseImageToGameImage } from '@/utils/gameUtils';

interface MultiplayerGameProps {
  onBack: () => void;
}

export default function MultiplayerGame({ onBack }: MultiplayerGameProps) {
  const [currentView, setCurrentView] = useState<'menu' | 'lobby' | 'game' | 'results' | 'finished'>('menu');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<GameImageType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [submittedParticipants, setSubmittedParticipants] = useState<string[]>([]);

  // Using the real multiplayer hook with new functions
  const { 
    gameState, 
    createRoom, 
    joinRoom, 
    leaveRoom, 
    toggleReady, 
    startGame,
    submitGuess,
    startRound,
    endRound,
    nextRound,
    isConnected, 
    canStartGame 
  } = useMultiplayerGame();

  // Update view based on game state
  useEffect(() => {
    if (gameState.room && currentView === 'menu') {
      setCurrentView('lobby');
    }
    
    if (gameState.current_session) {
      if (gameState.current_session.status === 'round_active') {
        setCurrentView('game');
      } else if (gameState.current_session.status === 'round_results') {
        setCurrentView('results');
      } else if (gameState.current_session.status === 'game_finished') {
        setCurrentView('finished');
      }
    }
  }, [gameState.room, gameState.current_session, currentView]);

  // Load current image when session changes
  useEffect(() => {
    const loadCurrentImage = async () => {
      if (gameState.current_session?.current_image_id) {
        try {
          const { data: image } = await supabase
            .from('game_images')
            .select('*')
            .eq('id', gameState.current_session.current_image_id)
            .single();
          
          if (image) {
            // Transform the database response with Google Drive URL conversion
            const transformedImage = transformDatabaseImageToGameImage(image);
            setCurrentImage(transformedImage);
          }
        } catch (err) {
          console.error('Error loading current image:', err);
        }
      }
    };

    loadCurrentImage();
  }, [gameState.current_session?.current_image_id]);

  // Timer management
  useEffect(() => {
    if (gameState.current_session?.status === 'round_active' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto end round if host
            if (gameState.is_host) {
              endRound();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.current_session?.status, timeRemaining, gameState.is_host, endRound]);

  // Reset timer when new round starts
  useEffect(() => {
    if (gameState.current_session?.status === 'round_active') {
      setTimeRemaining(gameState.room?.settings.time_per_round || 60);
      setSubmittedParticipants([]);
    }
  }, [gameState.current_session?.current_round, gameState.room?.settings.time_per_round]);

  const handleCreateRoom = async (roomName: string, settings: MultiplayerGameSettings, displayName: string) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await createRoom(roomName, settings, displayName);
      if (result.success) {
        console.log('✅ Room created successfully:', result.room);
        setCurrentView('lobby');
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomCode: string, displayName: string) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await joinRoom(roomCode, displayName);
      if (result.success) {
        console.log('✅ Joined room successfully:', result.room);
        setCurrentView('lobby');
      } else {
        setError(result.error || 'Failed to join room');
      }
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      setCurrentView('menu');
      setError('');
      setCurrentImage(null);
      setTimeRemaining(60);
      setSubmittedParticipants([]);
      console.log('✅ Left room successfully');
    } catch (err) {
      console.error('Error leaving room:', err);
      setError('Failed to leave room. Please try again.');
    }
  };

  const handleToggleReady = async () => {
    try {
      await toggleReady();
      console.log('✅ Ready status toggled');
    } catch (err) {
      console.error('Error toggling ready:', err);
      setError('Failed to update ready status. Please try again.');
    }
  };

  const handleStartGame = async () => {
    try {
      const result = await startGame();
      if (result.success) {
        console.log('✅ Game started successfully');
        // Start first round
        if (gameState.is_host) {
          await startRound(1);
        }
      } else {
        setError(result.error || 'Failed to start game');
      }
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start game. Please try again.');
    }
  };

  const handleSubmitGuess = async (yearGuess: number, locationGuess: { lat: number; lng: number }) => {
    try {
      const result = await submitGuess(yearGuess, locationGuess);
      if (result.success) {
        console.log('✅ Guess submitted successfully');
        setSubmittedParticipants(prev => [...prev, gameState.my_participant_id || '']);
        
        // Check if all players have submitted
        const allSubmitted = submittedParticipants.length + 1 >= gameState.participants.length;
        if (allSubmitted && gameState.is_host) {
          // End round after a short delay
          setTimeout(() => {
            endRound();
          }, 2000);
        }
      } else {
        setError(result.error || 'Failed to submit guess');
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
      setError('Failed to submit guess. Please try again.');
    }
  };

  const handleNextRound = async () => {
    try {
      const result = await nextRound();
      if (result.success) {
        console.log('✅ Next round started');
      } else {
        setError(result.error || 'Failed to start next round');
      }
    } catch (err) {
      console.error('Error starting next round:', err);
      setError('Failed to start next round. Please try again.');
    }
  };

  const handleEndGame = () => {
    setCurrentView('finished');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
    setError('');
  };

  // Render based on current view and game state
  if (currentView === 'menu') {
    return (
      <MultiplayerMenu
        onBack={onBack}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  if (currentView === 'lobby' && gameState.room) {
    return (
      <RoomLobby
        room={gameState.room}
        participants={gameState.participants}
        myParticipantId={gameState.my_participant_id || ''}
        isHost={gameState.is_host}
        isConnected={isConnected}
        canStartGame={canStartGame}
        onLeaveRoom={handleLeaveRoom}
        onToggleReady={handleToggleReady}
        onStartGame={handleStartGame}
        error={error}
      />
    );
  }

  if (currentView === 'game' && gameState.current_session && currentImage) {
    return (
      <MultiplayerGameInterface
        session={gameState.current_session}
        participants={gameState.participants}
        currentImage={currentImage}
        myParticipantId={gameState.my_participant_id || ''}
        timeRemaining={timeRemaining}
        submittedParticipants={submittedParticipants}
        onSubmitGuess={handleSubmitGuess}
        onBack={handleLeaveRoom}
      />
    );
  }

  if (currentView === 'results' && gameState.current_session && currentImage) {
    return (
      <MultiplayerRoundResults
        roundNumber={gameState.current_session.current_round}
        totalRounds={gameState.current_session.total_rounds}
        currentImage={currentImage}
        roundResults={gameState.round_results.filter(r => r.round_number === gameState.current_session?.current_round)}
        leaderboard={gameState.leaderboard}
        participants={gameState.participants}
        myParticipantId={gameState.my_participant_id || ''}
        isHost={gameState.is_host}
        allPlayersReady={areAllPlayersReady(gameState.participants)}
        onNextRound={handleNextRound}
        onToggleReady={handleToggleReady}
        onEndGame={handleEndGame}
      />
    );
  }

  if (currentView === 'finished') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-amber-800 mb-4">Game Complete!</h1>
          <p className="text-amber-700 mb-8">Final results and winner announcement</p>
          <button 
            onClick={handleBackToMenu}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
} 