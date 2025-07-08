import React, { useEffect, useState } from 'react';
import { SimpleMultiplayerMenu } from './SimpleMultiplayerMenu';
import { SimpleMultiplayerLobby } from './SimpleMultiplayerLobby';
import Game from './Game';
import { useSimpleMultiplayer } from '@/hooks/useSimpleMultiplayer';

interface SimpleMultiplayerContainerProps {
  onBack: () => void;
  onHome: () => void;
}

export const SimpleMultiplayerContainer: React.FC<SimpleMultiplayerContainerProps> = ({ onBack, onHome }) => {
  const multiplayer = useSimpleMultiplayer();
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});

  // Expose debug functions to global scope for console debugging
  useEffect(() => {
    if (multiplayer.debugDatabaseState) {
      (window as any).debugMultiplayer = multiplayer.debugDatabaseState;
      (window as any).forceNextRound = multiplayer.debugForceNextRound;
      console.log('🔧 Debug functions exposed: window.debugMultiplayer() and window.forceNextRound()');
    }
    return () => {
      delete (window as any).debugMultiplayer;
      delete (window as any).forceNextRound;
    };
  }, [multiplayer.debugDatabaseState, multiplayer.debugForceNextRound]);

  // Load player names when participants change
  useEffect(() => {
    const loadNames = async () => {
      if (multiplayer.room?.id && multiplayer.participants.length > 0) {
        try {
          const names = await multiplayer.loadPlayerNames(multiplayer.room.id);
          setPlayerNames(names);
        } catch (error) {
          console.error('Failed to load player names:', error);
        }
      }
    };

    loadNames();
  }, [multiplayer.room?.id, multiplayer.participants, multiplayer.loadPlayerNames]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🎯 Multiplayer state update:', {
      isConnected: multiplayer.isConnected,
      room: multiplayer.room?.room_code,
      participants: multiplayer.participants,
      participantCount: multiplayer.participants.length,
      gameStatus: multiplayer.room?.game_status,
      isHost: multiplayer.isHost,
      currentRound: multiplayer.room?.current_round,
      imageSequence: multiplayer.room?.image_sequence?.length,
      shouldShowGame: multiplayer.room?.game_status === 'playing' || multiplayer.room?.game_status === 'finished'
    });
    
    // If room becomes null unexpectedly, log it
    if (!multiplayer.room && multiplayer.isConnected) {
      console.log('⚠️ Warning: Room is null but still connected - this might indicate an issue');
    }
    
    // Log when game status changes
    if (multiplayer.room?.game_status) {
      console.log(`🎮 Game status is: ${multiplayer.room.game_status} (${multiplayer.isHost ? 'HOST' : 'PLAYER'})`);
    }
  }, [multiplayer.isConnected, multiplayer.room, multiplayer.participants, multiplayer.isHost]);

  // Disabled automatic round progression - using manual host controls only
  // useEffect(() => {
  //   // Automatic progression disabled - host will use manual controls
  // }, []);

  // Wrapper function to match the expected signature
  const handleCreateRoom = async (displayName: string, settings: { rounds: number; timePerRound: number }) => {
    return await multiplayer.createRoom({
      displayName,
      rounds: settings.rounds,
      timePerRound: settings.timePerRound
    });
  };

  // Show game if in room and playing or finished
  if (multiplayer.isConnected && multiplayer.room && (multiplayer.room.game_status === 'playing' || multiplayer.room.game_status === 'finished')) {
    console.log('🎮 Rendering game with state:', {
      roomCode: multiplayer.room.room_code,
      gameStatus: multiplayer.room.game_status,
      isHost: multiplayer.isHost,
      participants: multiplayer.participants,
      participantCount: multiplayer.participants.length
    });

    return (
      <Game
        multiplayerMode={true}
        multiplayerState={{
          roomCode: multiplayer.room.room_code,
          currentRound: multiplayer.room.current_round,
          totalRounds: multiplayer.room.total_rounds,
          playersReady: 0, // Will be calculated from participants who submitted
          totalPlayers: multiplayer.participants.length,
          waitingForPlayers: false, // Will be determined by game logic
          gameStarted: true,
          imageSequence: multiplayer.room.image_sequence || [],
          getMultiplayerImages: multiplayer.getMultiplayerImages,
          timePerRound: multiplayer.room.time_per_round,
          isHost: multiplayer.isHost,
          getLeaderboard: multiplayer.getLeaderboard,
          getRoundLeaderboard: multiplayer.getRoundLeaderboard,
          currentUserId: multiplayer.currentUserId,
          gameStatus: multiplayer.room.game_status,
          playerNames: playerNames
        }}
        onMultiplayerGuessSubmit={async (yearGuess, locationGuess, timeUsed) => {
          try {
            console.log('🎯 Submitting multiplayer guess:', { yearGuess, locationGuess, timeUsed });
            
            // Get the actual year and location from the current image via the multiplayer images
            let actualYear = yearGuess; // fallback to guess if we can't get actual year
            let actualLocation = undefined;
            
            try {
              const multiplayerImages = await multiplayer.getMultiplayerImages();
              const currentImage = multiplayerImages[multiplayer.room.current_round - 1]; // rounds are 1-indexed
              if (currentImage) {
                actualYear = currentImage.year;
                actualLocation = {
                  lat: currentImage.location.lat,
                  lng: currentImage.location.lng
                };
                console.log('📅 Got actual data from current image:', { 
                  currentRound: multiplayer.room.current_round, 
                  actualYear, 
                  actualLocation 
                });
              } else {
                console.log('⚠️ Could not find current image, using guess as actual year');
              }
            } catch (error) {
              console.error('❌ Error getting actual data from image:', error);
            }

            console.log('📝 About to call submitGuess with full data:', { 
              yearGuess, 
              actualYear, 
              timeUsed,
              locationGuess, 
              actualLocation 
            });
            
            await multiplayer.submitGuess(yearGuess, actualYear, timeUsed, locationGuess, actualLocation);
            
            console.log('✅ Guess submitted, current scores:', multiplayer.scores);
          } catch (error) {
            console.error('❌ Error submitting multiplayer guess:', error);
            // Don't throw the error - just log it to prevent game crashes
          }
        }}
        onMultiplayerNextRound={async () => {
          console.log('🎮 onMultiplayerNextRound called by host');
          try {
            await multiplayer.nextRound();
            console.log('✅ Host successfully advanced to next round');
          } catch (error) {
            console.error('❌ Error in host next round:', error);
            throw error;
          }
        }}
        onMultiplayerExit={() => {
          try {
            multiplayer.leaveRoom();
            onBack();
          } catch (error) {
            console.error('❌ Error leaving multiplayer room:', error);
            // Force navigation back even if leaving room fails
            onBack();
          }
        }}
      />
    );
  }

  // Show lobby if in room but not playing
  if (multiplayer.isConnected && multiplayer.room && multiplayer.room.game_status === 'waiting') {
    console.log('🏠 Rendering lobby with state:', {
      roomCode: multiplayer.room.room_code,
      gameStatus: multiplayer.room.game_status,
      isHost: multiplayer.isHost,
      participants: multiplayer.participants,
      participantCount: multiplayer.participants.length
    });
    return (
      <SimpleMultiplayerLobby
        room={multiplayer.room}
        participants={multiplayer.participants}
        playerNames={playerNames}
        isHost={multiplayer.isHost}
        onBack={onBack}
        onStartGame={multiplayer.startGame}
        onLeaveRoom={multiplayer.leaveRoom}
        onHome={onHome}
      />
    );
  }

  // If we were connected but lost the room, show a message instead of going back to menu
  if (multiplayer.isConnected && !multiplayer.room) {
    console.log('🔄 Connected but no room - showing loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Reconnecting to game...</p>
        </div>
      </div>
    );
  }

  // Show menu by default
  return (
    <SimpleMultiplayerMenu
      onBack={onBack}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={multiplayer.joinRoom}
      onHome={onHome}
    />
  );
}; 