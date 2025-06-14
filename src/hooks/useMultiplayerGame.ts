import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import type {
  MultiplayerGameState,
  MultiplayerRoom,
  RoomParticipant,
  MultiplayerGameSession,
  MultiplayerRoundResult,
  MultiplayerEvent,
  MultiplayerGameSettings,
  MultiplayerLeaderboard
} from '@/types/multiplayer';
import {
  generateRoomCode,
  getRandomAvatarColor,
  getUsedAvatarColors,
  calculateLeaderboard,
  areAllPlayersReady,
  findNextHost,
  generateGuestName,
  generateChannelNames,
  debounce
} from '@/utils/multiplayerUtils';
import { MULTIPLAYER_CONSTANTS } from '@/types/multiplayer';
import { calculateDistance } from '@/utils/gameUtils';
import { transformDatabaseImageToGameImage } from '@/utils/gameUtils';

// Cross-browser UUID generation function
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for browsers that don't support crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useMultiplayerGame = () => {
  const [gameState, setGameState] = useState<MultiplayerGameState>({
    room: null,
    participants: [],
    current_session: null,
    leaderboard: [],
    my_participant_id: null,
    is_host: false,
    connection_status: 'disconnected',
    round_results: [],
    chat_messages: []
  });

  const channelsRef = useRef<{
    room?: RealtimeChannel;
    game?: RealtimeChannel;
    chat?: RealtimeChannel;
  }>({});

  const heartbeatRef = useRef<NodeJS.Timeout>();
  const reconnectRef = useRef<NodeJS.Timeout>();

  // Debounced state updates for better performance
  const debouncedUpdateLeaderboard = useCallback(
    debounce(() => {
      if (gameState.participants.length > 0 && gameState.round_results.length > 0) {
        const newLeaderboard = calculateLeaderboard(gameState.participants, gameState.round_results);
        setGameState(prev => ({ ...prev, leaderboard: newLeaderboard }));
      }
    }, 500),
    [gameState.participants, gameState.round_results]
  );

  // Connect to Supabase realtime channels
  const connectToChannels = useCallback(async (roomId: string, sessionId?: string) => {
    try {
      setGameState(prev => ({ ...prev, connection_status: 'connecting' }));
      
      const channels = generateChannelNames(roomId, sessionId);
      
      // Room channel for participant management
      const roomChannel = supabase.channel(channels.room, {
        config: { presence: { key: 'participant_id' } }
      });

      // Game channel for gameplay events
      const gameChannel = supabase.channel(channels.game);
      
      // Chat channel for messages
      const chatChannel = supabase.channel(channels.chat);

      // Set up room event handlers
      roomChannel
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'room_participants',
            filter: `room_id=eq.${roomId}`
          },
          handleParticipantChanges
        )
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'multiplayer_rooms',
            filter: `id=eq.${roomId}`
          },
          handleRoomChanges
        )
        .on('presence', { event: 'sync' }, handlePresenceSync)
        .on('presence', { event: 'join' }, handlePresenceJoin)
        .on('presence', { event: 'leave' }, handlePresenceLeave);

      // Set up game event handlers
      gameChannel
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'multiplayer_sessions',
            filter: `room_id=eq.${roomId}`
          },
          handleSessionChanges
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'multiplayer_round_results' },
          handleRoundResultsChanges
        )
        .on('broadcast', { event: 'game_event' }, handleGameEvent);

      // Set up chat handlers
      chatChannel
        .on('broadcast', { event: 'chat_message' }, handleChatMessage);

      // Subscribe to all channels
      const subscribeResults = await Promise.all([
        roomChannel.subscribe(),
        gameChannel.subscribe(),
        chatChannel.subscribe()
      ]);

      console.log('Channel subscription results:', subscribeResults);
      
      // Add broadcast listener for participant changes as backup
      roomChannel.on('broadcast', { event: 'participant_update' }, (payload) => {
        console.log('Received participant broadcast:', payload);
        if (payload.payload) {
          handleParticipantChanges({
            eventType: payload.payload.eventType,
            new: payload.payload.participant,
            old: payload.payload.old_participant
          });
        }
      });

      channelsRef.current = { room: roomChannel, game: gameChannel, chat: chatChannel };
      
      setGameState(prev => ({ ...prev, connection_status: 'connected' }));
      startHeartbeat();
      
    } catch (error) {
      console.error('Failed to connect to channels:', error);
      setGameState(prev => ({ ...prev, connection_status: 'disconnected' }));
    }
  }, []);

  // Disconnect from all channels
  const disconnectFromChannels = useCallback(() => {
    Object.values(channelsRef.current).forEach(channel => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    });
    channelsRef.current = {};
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    
    setGameState(prev => ({ ...prev, connection_status: 'disconnected' }));
  }, []);

  // Start heartbeat to maintain connection
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    
    heartbeatRef.current = setInterval(async () => {
      if (gameState.my_participant_id && channelsRef.current.room) {
        try {
          await supabase
            .from('room_participants')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', gameState.my_participant_id);
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, MULTIPLAYER_CONSTANTS.HEARTBEAT_INTERVAL * 1000);
  }, [gameState.my_participant_id]);

  // Event handlers
  const handleParticipantChanges = useCallback((payload: any) => {
    console.log('Participant change received:', payload.eventType, payload);
    
    // Handle participant joins/leaves/updates
    if (payload.eventType === 'INSERT') {
      setGameState(prev => {
        // Check if participant already exists to prevent duplicates
        const exists = prev.participants.some(p => p.id === payload.new.id);
        if (exists) {
          console.log('Participant already exists, skipping duplicate:', payload.new.id);
          return prev;
        }
        
        console.log('Adding new participant:', payload.new);
        return {
          ...prev,
          participants: [...prev.participants, payload.new]
        };
      });
    } else if (payload.eventType === 'UPDATE') {
      setGameState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === payload.new.id ? payload.new : p
        )
      }));
    } else if (payload.eventType === 'DELETE') {
      setGameState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== payload.old.id)
      }));
    }
  }, []);

  const handleRoomChanges = useCallback((payload: any) => {
    if (payload.eventType === 'UPDATE' && gameState.room?.id === payload.new.id) {
      setGameState(prev => ({
        ...prev,
        room: payload.new as MultiplayerRoom,
        participants: prev.participants.map(p => 
          p.room_id === payload.new.id 
            ? { ...p, room_id: payload.new.id }
            : p
        )
      }));
    }
  }, [gameState.room?.id]);

  const handleSessionChanges = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      setGameState(prev => ({ ...prev, current_session: payload.new }));
    }
  }, []);

  const handleRoundResultsChanges = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      setGameState(prev => ({
        ...prev,
        round_results: [...prev.round_results, payload.new]
      }));
      debouncedUpdateLeaderboard();
    }
  }, [debouncedUpdateLeaderboard]);

  const handleGameEvent = useCallback((payload: { event: MultiplayerEvent }) => {
    const event = payload.event;
    
    switch (event.type) {
      case 'player_joined':
        // Already handled by participant changes
        break;
      case 'player_left':
        // Already handled by participant changes
        break;
      case 'game_started':
        // Session will be updated via handleSessionChanges
        break;
      case 'round_started':
        // Update current round info
        setGameState(prev => ({
          ...prev,
          current_session: prev.current_session ? {
            ...prev.current_session,
            current_round: event.round_number,
            current_image_id: event.image_id,
            round_start_time: event.start_time,
            status: 'round_active'
          } : null
        }));
        break;
      case 'round_ended':
        setGameState(prev => ({
          ...prev,
          leaderboard: event.leaderboard,
          current_session: prev.current_session ? {
            ...prev.current_session,
            status: 'round_results'
          } : null
        }));
        break;
      case 'game_ended':
        setGameState(prev => ({
          ...prev,
          leaderboard: event.final_leaderboard,
          current_session: prev.current_session ? {
            ...prev.current_session,
            status: 'game_finished'
          } : null
        }));
        break;
    }
  }, []);

  const handleChatMessage = useCallback((payload: { event: any }) => {
    setGameState(prev => ({
      ...prev,
      chat_messages: [...prev.chat_messages, payload.event]
    }));
  }, []);

  const handlePresenceSync = useCallback(() => {
    // Handle presence synchronization
  }, []);

  const handlePresenceJoin = useCallback((payload: any) => {
    // Handle new presence joins
  }, []);

  const handlePresenceLeave = useCallback((payload: any) => {
    // Handle presence leaves
  }, []);

  // Public API methods
  const createRoom = useCallback(async (
    roomName: string,
    settings: MultiplayerGameSettings,
    displayName: string
  ): Promise<{ success: boolean; room?: MultiplayerRoom; error?: string }> => {
    try {
      // Generate unique room code using database function
      const { data: codeResult } = await supabase.rpc('generate_unique_room_code');
      if (!codeResult) {
        return { success: false, error: 'Failed to generate room code' };
      }
      
      const roomCode = codeResult;
      const avatarColor = getRandomAvatarColor();
      const tempHostId = generateUUID();
      
      // Create room
      const { data: room, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .insert({
          code: roomCode,
          name: roomName,
          host_id: tempHostId, // Will be updated after participant creation
          status: 'waiting',
          max_players: settings.allow_spectators ? MULTIPLAYER_CONSTANTS.MAX_PLAYERS_LIMIT : MULTIPLAYER_CONSTANTS.MAX_PLAYERS_DEFAULT,
          current_players: 0, // Will be updated by trigger
          settings: settings as any
        })
        .select()
        .single();

      if (roomError || !room) {
        return { success: false, error: roomError?.message || 'Failed to create room' };
      }

      // Create host participant
      const { data: participant, error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          display_name: displayName,
          role: 'host',
          status: 'ready',
          avatar_color: avatarColor,
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (participantError || !participant) {
        await supabase.from('multiplayer_rooms').delete().eq('id', room.id);
        return { success: false, error: participantError?.message || 'Failed to create participant' };
      }

      // Update room with correct host_id
      const { error: updateError } = await supabase
        .from('multiplayer_rooms')
        .update({ host_id: participant.id })
        .eq('id', room.id);

      if (updateError) {
        await supabase.from('multiplayer_rooms').delete().eq('id', room.id);
        return { success: false, error: updateError.message };
      }

      const updatedRoom = { ...room, host_id: participant.id } as MultiplayerRoom;

      await connectToChannels(room.id);
      
      // Load participants after connecting to channels to ensure real-time sync
      const { data: participants } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id);

      setGameState(prev => ({
        ...prev,
        room: updatedRoom,
        participants: participants || [participant],
        my_participant_id: participant.id,
        is_host: true
      }));
      
      // Broadcast participant creation to other devices
      if (channelsRef.current.room) {
        console.log('Broadcasting participant creation:', participant);
        await channelsRef.current.room.send({
          type: 'broadcast',
          event: 'participant_update',
          payload: {
            eventType: 'INSERT',
            participant: participant
          }
        });
      }
      
      return { success: true, room: updatedRoom };
    } catch (error) {
      console.error('Error creating room:', error);
      return { success: false, error: 'Failed to create room' };
    }
  }, [connectToChannels]);

  const joinRoom = useCallback(async (
    roomCode: string,
    displayName: string
  ): Promise<{ success: boolean; room?: MultiplayerRoom; error?: string }> => {
    try {
      // Find room by code
      const { data: room, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        return { success: false, error: 'Room not found or already started' };
      }

      // Check if room is full
      if (room.current_players >= room.max_players) {
        return { success: false, error: 'Room is full' };
      }

      // Get existing participants to avoid color conflicts
      const { data: existingParticipants } = await supabase
        .from('room_participants')
        .select('avatar_color')
        .eq('room_id', room.id);

      const usedColors = existingParticipants?.map(p => p.avatar_color) || [];
      const avatarColor = getRandomAvatarColor(usedColors);

      // Create participant
      const { data: participant, error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: room.id,
          display_name: displayName,
          role: 'player',
          status: 'ready',
          avatar_color: avatarColor,
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (participantError || !participant) {
        return { success: false, error: participantError?.message || 'Failed to join room' };
      }

      await connectToChannels(room.id);
      
      // Load all participants after connecting to channels
      const { data: allParticipants } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', room.id);

      setGameState(prev => ({
        ...prev,
        room: room as MultiplayerRoom,
        participants: allParticipants || [],
        my_participant_id: participant.id,
        is_host: false
      }));
      
      // Broadcast participant join to other devices
      if (channelsRef.current.room) {
        console.log('Broadcasting participant join:', participant);
        await channelsRef.current.room.send({
          type: 'broadcast',
          event: 'participant_update',
          payload: {
            eventType: 'INSERT',
            participant: participant
          }
        });
      }
      
      return { success: true, room: room as MultiplayerRoom };
    } catch (error) {
      console.error('Error joining room:', error);
      return { success: false, error: 'Failed to join room' };
    }
  }, [connectToChannels]);

  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!gameState.room || !gameState.my_participant_id) return;

    try {
      // Remove participant (triggers will handle room cleanup)
      await supabase
        .from('room_participants')
        .delete()
        .eq('id', gameState.my_participant_id);

      disconnectFromChannels();
      
      setGameState({
        room: null,
        participants: [],
        current_session: null,
        leaderboard: [],
        my_participant_id: null,
        is_host: false,
        connection_status: 'disconnected',
        round_results: [],
        chat_messages: []
      });
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [gameState.room, gameState.my_participant_id, disconnectFromChannels]);

  const toggleReady = useCallback(async (): Promise<void> => {
    if (!gameState.my_participant_id) return;

    const currentParticipant = gameState.participants.find(p => p.id === gameState.my_participant_id);
    if (!currentParticipant) return;

    const newStatus = currentParticipant.status === 'ready' ? 'disconnected' : 'ready';

    try {
      // Update database
      const { error } = await supabase
        .from('room_participants')
        .update({ status: newStatus })
        .eq('id', gameState.my_participant_id);

      if (error) {
        console.error('Error updating ready status:', error);
        return;
      }

      // Immediately update local state
      setGameState(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === gameState.my_participant_id 
            ? { ...p, status: newStatus }
            : p
        )
      }));

      // Broadcast the change to other devices
      if (channelsRef.current.room) {
        console.log('Broadcasting ready status change:', { participant_id: gameState.my_participant_id, status: newStatus });
        await channelsRef.current.room.send({
          type: 'broadcast',
          event: 'participant_update',
          payload: {
            eventType: 'UPDATE',
            participant: { ...currentParticipant, status: newStatus },
            old_participant: currentParticipant
          }
        });
      }
    } catch (error) {
      console.error('Error toggling ready status:', error);
    }
  }, [gameState.my_participant_id, gameState.participants]);

  const startGame = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!gameState.room || !gameState.is_host) {
      return { success: false, error: 'Only host can start game' };
    }

    if (!areAllPlayersReady(gameState.participants)) {
      return { success: false, error: 'All players must be ready' };
    }

    try {
      // Get random images for the game
      const { data: imageIds } = await supabase.rpc('get_multiplayer_game_images', { 
        image_count: gameState.room.settings.rounds_count 
      });
      
      if (!imageIds || imageIds.length === 0) {
        return { success: false, error: 'Failed to load game images' };
      }

      // Clean up any existing sessions for this room first
      await supabase
        .from('multiplayer_sessions')
        .update({ status: 'game_finished' })
        .eq('room_id', gameState.room.id)
        .neq('status', 'game_finished');

      // Update room status
      await supabase
        .from('multiplayer_rooms')
        .update({ 
          status: 'playing',
          started_at: new Date().toISOString()
        })
        .eq('id', gameState.room.id);

      // Create new game session
      const { data: session, error: sessionError } = await supabase
        .from('multiplayer_sessions')
        .insert({
          room_id: gameState.room.id,
          current_round: 1,
          total_rounds: gameState.room.settings.rounds_count,
          status: 'waiting',
          images: imageIds,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError || !session) {
        return { success: false, error: sessionError?.message || 'Failed to create game session' };
      }

      // Broadcast game started event
      if (channelsRef.current.game) {
        // TODO: Fix broadcast type issue
        // await channelsRef.current.game.send({
        //   type: 'broadcast',
        //   event: 'game_event',
        //   payload: {
        //     event: {
        //       type: 'game_started',
        //       session_id: session.id,
        //       first_image_id: imageIds[0] || ''
        //     }
        //   }
        // });
      }

      return { success: true };
    } catch (error) {
      console.error('Error starting game:', error);
      return { success: false, error: 'Failed to start game' };
    }
  }, [gameState.room, gameState.is_host, gameState.participants]);

  // Submit guess for current round
  const submitGuess = useCallback(async (
    yearGuess: number, 
    locationGuess: { lat: number; lng: number }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!gameState.current_session || !gameState.my_participant_id) {
      return { success: false, error: 'No active session' };
    }

    try {
      // Calculate scores (simplified scoring for now)
      const currentImage = await supabase
        .from('game_images')
        .select('*')
        .eq('id', gameState.current_session.current_image_id)
        .single();

      if (!currentImage.data) {
        return { success: false, error: 'Failed to load current image' };
      }

      // Transform the database response with Google Drive URL conversion
      const image = transformDatabaseImageToGameImage(currentImage.data);

      const yearDiff = Math.abs(yearGuess - image.year);
      const yearScore = Math.max(0, 5000 - (yearDiff * 50));

      // Calculate location score (simplified)
      const locationScore = Math.max(0, 5000 - Math.random() * 2000); // TODO: Implement proper distance calculation

      const totalScore = yearScore + locationScore;

      // Save round result
      const { error: resultError } = await supabase
        .from('multiplayer_round_results')
        .insert({
          session_id: gameState.current_session.id,
          participant_id: gameState.my_participant_id,
          round_number: gameState.current_session.current_round,
          year_guess: yearGuess,
          location_guess_lat: locationGuess.lat,
          location_guess_lng: locationGuess.lng,
          year_score: yearScore,
          location_score: locationScore,
          total_score: totalScore,
          time_taken: 60, // TODO: Calculate actual time taken
          submitted_at: new Date().toISOString()
        });

      if (resultError) {
        return { success: false, error: resultError.message };
      }

      // Broadcast submission event
      if (channelsRef.current.game) {
        await channelsRef.current.game.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            event: {
              type: 'player_submitted',
              participant_id: gameState.my_participant_id,
              display_name: gameState.participants.find(p => p.id === gameState.my_participant_id)?.display_name || 'Unknown',
              time_taken: 60
            }
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error submitting guess:', error);
      return { success: false, error: 'Failed to submit guess' };
    }
  }, [gameState.current_session, gameState.my_participant_id, gameState.participants]);

  // Start next round (host only)
  const startRound = useCallback(async (roundNumber: number): Promise<{ success: boolean; error?: string }> => {
    if (!gameState.current_session || !gameState.is_host) {
      return { success: false, error: 'Only host can start rounds' };
    }

    try {
      const imageId = gameState.current_session.images[roundNumber - 1];
      if (!imageId) {
        return { success: false, error: 'No image available for this round' };
      }

      // Update session
      await supabase
        .from('multiplayer_sessions')
        .update({
          current_round: roundNumber,
          current_image_id: imageId,
          round_start_time: new Date().toISOString(),
          status: 'round_active'
        })
        .eq('id', gameState.current_session.id);

      // Broadcast round start
      if (channelsRef.current.game) {
        await channelsRef.current.game.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            event: {
              type: 'round_started',
              round_number: roundNumber,
              image_id: imageId,
              round_duration: gameState.room?.settings.time_per_round,
              start_time: new Date().toISOString()
            }
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error starting round:', error);
      return { success: false, error: 'Failed to start round' };
    }
  }, [gameState.current_session, gameState.is_host, gameState.room?.settings.time_per_round]);

  // End current round and show results (host only)
  const endRound = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!gameState.current_session || !gameState.is_host) {
      return { success: false, error: 'Only host can end rounds' };
    }

    try {
      // Update session status
      await supabase
        .from('multiplayer_sessions')
        .update({
          status: 'round_results',
          round_end_time: new Date().toISOString()
        })
        .eq('id', gameState.current_session.id);

      // Get round results
      const { data: roundResults } = await supabase
        .from('multiplayer_round_results')
        .select('*')
        .eq('session_id', gameState.current_session.id)
        .eq('round_number', gameState.current_session.current_round);

      // Calculate leaderboard
      const leaderboard = calculateLeaderboard(gameState.participants, gameState.round_results);

      // Broadcast round end
      if (channelsRef.current.game) {
        await channelsRef.current.game.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            event: {
              type: 'round_ended',
              round_number: gameState.current_session.current_round,
              results: roundResults || [],
              leaderboard: leaderboard
            }
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error ending round:', error);
      return { success: false, error: 'Failed to end round' };
    }
  }, [gameState.current_session, gameState.is_host, gameState.participants, gameState.round_results]);

  // Move to next round or end game (host only)
  const nextRound = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!gameState.current_session || !gameState.is_host) {
      return { success: false, error: 'Only host can advance rounds' };
    }

    const nextRoundNumber = gameState.current_session.current_round + 1;
    
    if (nextRoundNumber > gameState.current_session.total_rounds) {
      // End game
      await supabase
        .from('multiplayer_sessions')
        .update({
          status: 'game_finished'
        })
        .eq('id', gameState.current_session.id);

      // Broadcast game end
      if (channelsRef.current.game) {
        const finalLeaderboard = calculateLeaderboard(gameState.participants, gameState.round_results);
        await channelsRef.current.game.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            event: {
              type: 'game_ended',
              final_leaderboard: finalLeaderboard,
              session_id: gameState.current_session.id
            }
          }
        });
      }

      return { success: true };
    } else {
      // Start next round
      return await startRound(nextRoundNumber);
    }
  }, [gameState.current_session, gameState.is_host, gameState.participants, gameState.round_results, startRound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromChannels();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
    };
  }, [disconnectFromChannels]);

  return {
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
    isConnected: gameState.connection_status === 'connected',
    canStartGame: gameState.is_host && areAllPlayersReady(gameState.participants)
  };
}; 