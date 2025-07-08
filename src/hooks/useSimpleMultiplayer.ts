import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Types are kept relaxed (any) because the project does not yet have Supabase
 * generated types for the new tables. You can tighten these once types are generated.
 */
export interface SimpleMultiplayerRoom {
  id: string;
  room_code: string;
  host_user_id: string;
  current_round: number;
  total_rounds: number;
  time_per_round: number;
  current_image_id: string | null;
  image_sequence: string[] | null; // Array of image IDs for all rounds
  game_status: 'waiting' | 'playing' | 'finished';
  round_start_time: string | null;
}

export interface PlayerScore {
  user_id: string;
  round_number: number;
  points: number;
  guessed_year: number;
  actual_year: number;
  guess_time_seconds: number;
}

interface State {
  room: SimpleMultiplayerRoom | null;
  scores: PlayerScore[];
  participants: string[]; // user ids in presence
  isHost: boolean;
  isConnected: boolean;
  error?: string;
}

export const useSimpleMultiplayer = () => {
  const { user: authUser } = useAuth();
  
  // Create a fallback user if authentication fails or is loading
  const user = authUser || {
    id: `anon_${Math.random().toString(36).substring(2, 15)}`,
    email: `anonymous@localhost.local`,
    user_metadata: {
      username: `Anonymous_${Math.random().toString(36).substring(2, 8)}`,
      display_name: `Anonymous Player`
    }
  };
  
  console.log('🔐 Multiplayer auth state:', { 
    hasAuthUser: !!authUser, 
    usingFallback: !authUser,
    userId: user.id,
    userType: authUser ? 'authenticated' : 'anonymous'
  });
  
  const [state, setState] = useState<State>({
    room: null,
    scores: [],
    participants: [],
    isHost: false,
    isConnected: false
  });

  // Presence channel ref so we can clean up
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Cast as any to bypass missing table types until types are regenerated
  const sb = supabase as any;

  /** Helper to join presence and listen for updates */
  const joinPresence = useCallback((roomCode: string) => {
    console.log('🔄 Joining presence for room:', roomCode, 'user:', user.id, 'userType:', authUser ? 'authenticated' : 'anonymous');

    // Clean previous channel if any
    presenceChannelRef.current?.unsubscribe();

    const ch = sb.channel(`presence-room-${roomCode}`, {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    ch.on('presence', { event: 'sync' }, () => {
      const presenceState = ch.presenceState() as any;
      const participantIds = Object.keys(presenceState);
      console.log('👥 Presence sync - participants:', participantIds);
      setState(prev => ({ ...prev, participants: participantIds }));
    });

    ch.on('presence', { event: 'join' }, (payload) => {
      console.log('➕ User joined presence:', payload);
    });

    ch.on('presence', { event: 'leave' }, (payload) => {
      console.log('➖ User left presence:', payload);
    });

    ch.subscribe(async status => {
      console.log('📡 Presence channel status:', status);
      if (status === 'SUBSCRIBED') {
        const trackResult = await ch.track({ userId: user.id, joined_at: new Date().toISOString() });
        console.log('📍 Track result:', trackResult);
      }
    });

    presenceChannelRef.current = ch;
  }, [user, sb]);

  /** Load scores for room */
  const loadScores = useCallback(async (roomId: string) => {
    console.log('📊 Loading scores for room:', roomId);
    const { data, error } = await sb
      .from('simple_multiplayer_scores')
      .select('*')
      .eq('room_id', roomId);
    
    console.log('📊 Scores query result:', { 
      data, 
      error, 
      count: data?.length,
      scores: data?.map(s => ({ 
        user_id: s.user_id, 
        round: s.round_number, 
        points: s.points 
      }))
    });
    
    if (!error && data) {
      setState(prev => {
        console.log('📊 Previous scores state:', prev.scores.length, 'items');
        console.log('📊 New scores state:', data.length, 'items');
        return { ...prev, scores: data as any };
      });
    } else if (error) {
      console.error('❌ Error loading scores:', error);
    }
  }, [sb]);

  /** Load player display names for room */
  const loadPlayerNames = useCallback(async (roomId: string) => {
    console.log('👥 Loading player names for room:', roomId);
    const { data, error } = await sb
      .from('simple_multiplayer_players')
      .select('user_id, display_name')
      .eq('room_id', roomId);
    
    if (!error && data) {
      const playerNames: Record<string, string> = {};
      data.forEach(player => {
        playerNames[player.user_id] = player.display_name;
      });
      console.log('👥 Player names loaded:', playerNames);
      return playerNames;
    } else {
      console.error('❌ Error loading player names:', error);
      return {};
    }
  }, [sb]);

  /** Subscribe to realtime changes for room + scores */
  const subscribeRoom = useCallback((roomId: string) => {
    console.log('📡 Subscribing to room changes for room ID:', roomId);
    
    const channel = sb
      .channel(`room-db-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'simple_multiplayer_rooms', filter: `id=eq.${roomId}` }, payload => {
        console.log('🔄 Room data changed via realtime:', payload);
        console.log('🔄 Payload details:', {
          eventType: payload.eventType,
          old: payload.old,
          new: payload.new,
          table: payload.table
        });
        
        if (payload.new) {
          console.log('📝 Updating room state via realtime:', payload.new);
          console.log('📝 Old room state:', state.room);
          console.log('📝 New room state:', payload.new);
          setState(prev => ({ ...prev, room: payload.new as any }));
        } else if (payload.eventType === 'DELETE') {
          console.log('❌ Room was deleted via realtime');
          // Don't clear the room state on delete - let the user stay in the game
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'simple_multiplayer_scores', filter: `room_id=eq.${roomId}` }, (payload) => {
        console.log('🎯 Scores changed via realtime:', payload);
        console.log('🎯 Score change details:', {
          eventType: payload.eventType,
          table: payload.table,
          oldRecord: payload.old,
          newRecord: payload.new,
          roomId: roomId
        });
        
        // Force immediate score reload when realtime detects changes
        console.log('🔄 Triggering immediate score reload due to realtime change...');
        loadScores(roomId);
      })
      .subscribe((status) => {
        console.log('📡 Room subscription status:', status);
      });
      
    console.log('📡 Room subscription channel created:', channel);
    
    // Add periodic refresh for both room state and scores to ensure synchronization
    const refreshInterval = setInterval(async () => {
      console.log('🔄 Periodic room and scores refresh...');
      try {
        // Refresh room state
        const { data: currentRoom, error: refreshError } = await sb.from('simple_multiplayer_rooms').select('*').eq('id', roomId).single();
        
        if (refreshError) {
          console.error('❌ Error fetching room during refresh:', refreshError);
          return;
        }
        
        if (currentRoom) {
          setState(prev => {
            // Only update if the room state actually changed
            if (!prev.room || prev.room.game_status !== currentRoom.game_status || prev.room.current_round !== currentRoom.current_round) {
              console.log('📝 Periodic update - room state changed:', { 
                oldStatus: prev.room?.game_status, 
                newStatus: currentRoom.game_status,
                oldRound: prev.room?.current_round,
                newRound: currentRoom.current_round,
                isHost: prev.room?.host_user_id === user?.id,
                imageSequence: currentRoom.image_sequence?.length
              });
              
              return { ...prev, room: currentRoom as any };
            } else {
              console.log('📝 Periodic update - no changes detected:', {
                status: currentRoom.game_status,
                round: currentRoom.current_round,
                isHost: prev.room?.host_user_id === user?.id
              });
            }
            return prev;
          });
        } else {
          console.log('❌ Room not found during periodic refresh - room may have been deleted');
        }

        // Also refresh scores to ensure synchronization
        console.log('🔄 Periodic scores refresh...');
        await loadScores(roomId);
        
      } catch (error) {
        console.error('❌ Error during periodic refresh:', error);
      }
    }, 2000); // Check every 2 seconds
    
    // Store the interval so we can clean it up
    (channel as any).refreshInterval = refreshInterval;
    
    // Store the room channel reference for cleanup
    roomChannelRef.current = channel;
  }, [loadScores, sb]);

  /** Create a new room */
  const createRoom = useCallback(async (settings: { rounds: number; timePerRound: number; displayName: string }) => {
    console.log('🏠 Creating room with user:', user.id, 'settings:', settings);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await sb.from('simple_multiplayer_rooms').insert({
      room_code: code,
      host_user_id: user.id,
      total_rounds: settings.rounds,
      time_per_round: settings.timePerRound
    }).select().single();

    if (error || !data) return { success: false, error: error?.message || 'Failed to create room' };

    // Add player with display name
    const { error: playerError } = await sb.from('simple_multiplayer_players').insert({
      room_id: data.id,
      user_id: user.id,
      display_name: settings.displayName
    });

    if (playerError) {
      console.error('❌ Error adding player to room:', playerError);
      // Don't fail room creation if player insertion fails, but log it
    }

    // Presence & subscriptions
    joinPresence(code);
    subscribeRoom(data.id);
    loadScores(data.id);

    setState({ room: data as any, scores: [], participants: [user.id], isHost: true, isConnected: true });

    return { success: true, roomCode: code };
  }, [user, joinPresence, subscribeRoom, loadScores, sb]);

  /** Join existing room */
  const joinRoom = useCallback(async (code: string, displayName: string) => {
    console.log('🚪 Joining room with user:', user.id, 'room code:', code, 'displayName:', displayName);

    const { data, error } = await sb.from('simple_multiplayer_rooms').select('*').eq('room_code', code.toUpperCase()).single();
    if (error || !data) return { success: false, error: 'Room not found' };

    // Add player with display name (use upsert to handle rejoining)
    const { error: playerError } = await sb.from('simple_multiplayer_players')
      .upsert({
        room_id: data.id,
        user_id: user.id,
        display_name: displayName
      }, {
        onConflict: 'room_id,user_id'
      });

    if (playerError) {
      console.error('❌ Error adding player to room:', playerError);
      // Don't fail room joining if player insertion fails, but log it
    }

    joinPresence(data.room_code);
    subscribeRoom(data.id);
    loadScores(data.id);

    setState({ room: data as any, scores: [], participants: [], isHost: data.host_user_id === user.id, isConnected: true });

    return { success: true };
  }, [user, joinPresence, subscribeRoom, loadScores, sb]);

  /** Host: start game */
  const startGame = useCallback(async () => {
    console.log('🎮 Starting game...', { room: state.room?.id, isHost: state.isHost });
    
    if (!state.room || !state.isHost) {
      console.log('❌ Cannot start game - not host or no room');
      return { success: false, error: 'Not host' };
    }

    try {
      console.log('🖼️ Fetching game images...');
      
      // Get random images for all rounds (not just current round)
      const { data: images, error: imageError } = await sb.from('game_images').select('*').limit(50);
      
      console.log('🖼️ Images query result:', { imageCount: images?.length, imageError });
      
      if (imageError) {
        console.error('❌ Error fetching images:', imageError);
        return { success: false, error: `Failed to fetch images: ${imageError.message}` };
      }
      
      if (!images || images.length === 0) {
        console.log('❌ No images found');
        return { success: false, error: 'No images available' };
      }
      
      // Select random images for all rounds
      const totalRounds = state.room.total_rounds;
      const shuffledImages = images.sort(() => 0.5 - Math.random());
      const selectedImages = shuffledImages.slice(0, totalRounds);
      const imageIds = selectedImages.map(img => img.id);
      
      console.log('🎲 Selected images for all rounds:', imageIds);

      console.log('📝 Updating room status to playing...');
      
      const { error: updateError } = await sb.from('simple_multiplayer_rooms').update({
        game_status: 'playing',
        current_image_id: imageIds[0], // First image for round 1
        image_sequence: imageIds, // Store the complete image sequence in database
        round_start_time: new Date().toISOString()
      }).eq('id', state.room.id);

      console.log('📝 Room update result:', { updateError });

      if (updateError) {
        console.error('❌ Error updating room:', updateError);
        return { success: false, error: `Failed to start game: ${updateError.message}` };
      }

      console.log('✅ Game started successfully! Image sequence stored in database.');
      
      // Force a manual room state refresh to ensure all players get the update
      console.log('🔄 Manually broadcasting room state to all clients...');
      setTimeout(async () => {
        const { data: updatedRoom } = await sb.from('simple_multiplayer_rooms').select('*').eq('id', state.room.id).single();
        if (updatedRoom) {
          console.log('📡 Broadcasting updated room state:', updatedRoom);
        }
      }, 500);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Unexpected error starting game:', error);
      return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }, [state.room, state.isHost, sb]);

  /** Submit guess */
  const submitGuess = useCallback(async (guessedYear: number, actualYear: number, timeUsed: number, locationGuess?: { lat: number; lng: number }, actualLocation?: { lat: number; lng: number }) => {
    if (!state.room) {
      console.log('❌ Cannot submit guess: missing room', { hasRoom: !!state.room, userId: user.id });
      return;
    }

    console.log('📝 About to submit guess:', { 
      guessedYear, 
      actualYear, 
      timeUsed,
      locationGuess,
      actualLocation,
      round: state.room.current_round, 
      userId: user.id, 
      roomId: state.room.id,
      currentScoresCount: state.scores.length,
      currentRoundScores: state.scores.filter(s => s.round_number === state.room.current_round).length
    });

    // Calculate proper scoring using the same system as local game
    let totalDisplayScore = 0;
    
    if (locationGuess && actualLocation) {
      // Use the full scoring system when we have location data
      const { calculateCompleteScore } = await import('@/utils/scoringSystem');
      
      const timeRemaining = Math.max(0, (state.room.time_per_round || 60) - timeUsed);
      const scoreBreakdown = calculateCompleteScore(
        actualYear,
        actualLocation.lat,
        actualLocation.lng,
        guessedYear,
        locationGuess.lat,
        locationGuess.lng,
        timeRemaining,
        true, // isTimedMode
        'per-round'
      );
      
      totalDisplayScore = scoreBreakdown.displayTotalScore;
      
      console.log('📊 Full scoring calculation:', {
        yearGuess: guessedYear,
        actualYear,
        locationGuess,
        actualLocation,
        timeRemaining,
        scoreBreakdown,
        totalDisplayScore
      });
    } else {
      // Fallback: Use simplified year-only scoring but scale to match display scores
      const yearDiff = Math.abs(guessedYear - actualYear);
      const { calculateYearScore } = await import('@/utils/scoringSystem');
      
      const rawYearScore = calculateYearScore(actualYear, guessedYear);
      const displayYearScore = rawYearScore * 50; // DISPLAY_MULTIPLIER
      
      // Add time bonus if applicable
      const timeRemaining = Math.max(0, (state.room.time_per_round || 60) - timeUsed);
      const timeBonus = timeRemaining * 2; // TIME_BONUS_MULTIPLIER
      
      totalDisplayScore = displayYearScore + timeBonus;
      
      console.log('📊 Simplified year-only scoring:', {
        yearDiff,
        rawYearScore,
        displayYearScore,
        timeRemaining,
        timeBonus,
        totalDisplayScore
      });
    }

    const scoreData = {
      room_id: state.room.id,
      user_id: user.id,
      round_number: state.room.current_round,
      guessed_year: guessedYear,
      actual_year: actualYear,
      points: Math.round(totalDisplayScore), // Store the display score directly
      guess_time_seconds: timeUsed
    };

    console.log('📊 Score data to insert (using proper scoring):', scoreData);

    const { data, error } = await sb.from('simple_multiplayer_scores').insert(scoreData);

    if (error) {
      console.error('❌ Error submitting guess:', error);
    } else {
      console.log('✅ Guess submitted successfully to database:', data);
      
      // Manually reload scores to ensure immediate update
      console.log('🔄 Manually reloading scores after submission...');
      const scoresBeforeReload = state.scores.length;
      await loadScores(state.room.id);
      
      // Add a small delay and check again to ensure the score was properly loaded
      setTimeout(async () => {
        console.log('🔍 Verifying score submission after delay...');
        await loadScores(state.room.id);
        const scoresAfterReload = state.scores.length;
        console.log('📊 Score counts - Before:', scoresBeforeReload, 'After:', scoresAfterReload);
      }, 1000);
    }
  }, [state.room, user, sb, loadScores]);

  /** Check if all players have submitted guesses for current round */
  const checkAllPlayersReady = useCallback(() => {
    if (!state.room) return false;
    
    const currentRoundScores = state.scores.filter(s => s.round_number === state.room.current_round);
    const playersReady = currentRoundScores.length;
    
    // For multiplayer games, we know there should be exactly 2 players
    // Use a more reliable method to determine total players
    let totalPlayers = 2; // Default to 2 for multiplayer
    
    // If we have scores from any round, count unique users who have ever played
    const allUniqueUsers = [...new Set(state.scores.map(s => s.user_id))];
    if (allUniqueUsers.length > 0) {
      totalPlayers = Math.max(allUniqueUsers.length, 2); // At least 2, but could be more if more users joined
    }
    
    // Also check presence participants as backup
    if (state.participants.length > totalPlayers) {
      totalPlayers = state.participants.length;
    }
    
    const allPlayersReady = playersReady >= totalPlayers;
    
    console.log('🔍 Checking player readiness:', { 
      playersReady, 
      totalPlayers, 
      currentRound: state.room.current_round,
      allUniqueUsers,
      currentRoundScores: currentRoundScores.map(s => ({ user: s.user_id, round: s.round_number, points: s.points })),
      participants: state.participants,
      allPlayersReady,
      scoresInState: state.scores.length,
      method: allUniqueUsers.length > 0 ? 'unique_users' : (state.participants.length > 0 ? 'participants' : 'default_2')
    });
    
    return allPlayersReady;
  }, [state.room, state.scores, state.participants]);

  /** Get leaderboard for current game */
  const getLeaderboard = useCallback(() => {
    if (!state.room) return [];
    
    // Get all unique users who have submitted scores, not just current participants
    const allUsersWithScores = [...new Set(state.scores.map(s => s.user_id))];
    
    console.log('📊 Creating leaderboard for users:', {
      participants: state.participants,
      usersWithScores: allUsersWithScores,
      totalScores: state.scores.length
    });
    
    // Group scores by user and calculate total points
    const userTotals = allUsersWithScores.map(userId => {
      const userScores = state.scores.filter(s => s.user_id === userId);
      const totalPoints = userScores.reduce((sum, score) => sum + score.points, 0);
      const roundsPlayed = userScores.length;
      
      console.log('📊 User score calculation:', {
        userId,
        userScores: userScores.map(s => ({ round: s.round_number, points: s.points })),
        totalPoints,
        roundsPlayed
      });
      
      return {
        userId,
        totalPoints,
        roundsPlayed,
        averagePoints: roundsPlayed > 0 ? Math.round(totalPoints / roundsPlayed) : 0
      };
    });
    
    // Sort by total points descending
    const sortedLeaderboard = userTotals.sort((a, b) => b.totalPoints - a.totalPoints);
    
    console.log('📊 Final leaderboard:', sortedLeaderboard);
    
    return sortedLeaderboard;
  }, [state.scores]);

  /** Get round-specific leaderboard */
  const getRoundLeaderboard = useCallback((roundNumber: number) => {
    if (!state.room) return [];
    
    const roundScores = state.scores.filter(s => s.round_number === roundNumber);
    
    return roundScores
      .map(score => ({
        userId: score.user_id,
        points: score.points,
        guessedYear: score.guessed_year,
        actualYear: score.actual_year,
        timeUsed: score.guess_time_seconds
      }))
      .sort((a, b) => b.points - a.points);
  }, [state.scores]);

  /** Get multiplayer game images based on room's image sequence */
  const getMultiplayerImages = useCallback(async () => {
    console.log('🎮 getMultiplayerImages called, checking room state:', {
      hasRoom: !!state.room,
      hasImageSequence: !!state.room?.image_sequence?.length,
      isHost: state.isHost,
      roomCode: state.room?.room_code,
      currentRound: state.room?.current_round,
      gameStatus: state.room?.game_status
    });

    if (!state.room) {
      console.log('❌ No room found');
      return [];
    }

    // If no image sequence in local state, try to fetch fresh room data from database
    if (!state.room.image_sequence || state.room.image_sequence.length === 0) {
      console.log('⚠️ No image sequence in local state, fetching fresh room data...');
      
      const { data: freshRoom, error: roomError } = await sb
        .from('simple_multiplayer_rooms')
        .select('*')
        .eq('id', state.room.id)
        .single();
        
      if (roomError || !freshRoom) {
        console.error('❌ Error fetching fresh room data:', roomError);
        return [];
      }
      
      console.log('🔄 Fresh room data:', {
        hasImageSequence: !!freshRoom.image_sequence?.length,
        imageSequence: freshRoom.image_sequence,
        gameStatus: freshRoom.game_status
      });
      
      // Update local state with fresh room data
      setState(prev => ({ ...prev, room: freshRoom as any }));
      
      if (!freshRoom.image_sequence || freshRoom.image_sequence.length === 0) {
        console.log('❌ No image sequence found even in fresh room data');
        return [];
      }
      
      // Use the fresh room data
      console.log('🎮 Using fresh image sequence from database:', freshRoom.image_sequence);
    } else {
      console.log('🎮 Using cached image sequence:', state.room.image_sequence);
    }

    // Get the current image sequence (either from fresh data or cached)
    const currentImageSequence = state.room.image_sequence;
    
    try {
      const { data: images, error } = await sb
        .from('game_images')
        .select('*')
        .in('id', currentImageSequence);

      if (error) {
        console.error('❌ Error fetching multiplayer images:', error);
        return [];
      }

      if (!images || images.length === 0) {
        console.log('❌ No images found for the sequence');
        return [];
      }

      // Transform database results to match GameImage interface
      const transformedImages = images.map(img => ({
        id: img.id,
        image_url: img.image_url,
        year: img.year,
        location: {
          lat: img.location_lat,
          lng: img.location_lng,
          name: img.location_name
        },
        description: img.description
      }));

      // Sort images to match the original sequence order
      const sortedImages = currentImageSequence.map(id => 
        transformedImages.find(img => img.id === id)
      ).filter(Boolean);

      console.log('✅ Fetched and transformed multiplayer images:', {
        sequenceLength: currentImageSequence.length,
        foundImages: sortedImages.length,
        imageIds: sortedImages.map(img => img.id),
        expectedSequence: currentImageSequence
      });
      
      return sortedImages;
    } catch (error) {
      console.error('❌ Error in getMultiplayerImages:', error);
      return [];
    }
  }, [state.room, sb]);

  /** Host: next round */
  const nextRound = useCallback(async () => {
    if (!state.room || !state.isHost) return;
    const next = state.room.current_round + 1;
    if (next > state.room.total_rounds) {
      await sb.from('simple_multiplayer_rooms').update({ game_status: 'finished' }).eq('id', state.room.id);
      return;
    }

    // Use the next image from the predefined sequence
    const nextImageId = state.room.image_sequence?.[next - 1]; // next - 1 because arrays are 0-indexed
    
    if (!nextImageId) {
      console.error('❌ No image found for round', next);
      return;
    }

    console.log('🎮 Moving to round', next, 'with image:', nextImageId);

    await sb.from('simple_multiplayer_rooms').update({
      current_round: next,
      current_image_id: nextImageId,
      round_start_time: new Date().toISOString()
    }).eq('id', state.room.id);
  }, [state.room, state.isHost, sb]);

  /** Leave room */
  const leaveRoom = useCallback(() => {
    console.log('🚪 Leaving room and cleaning up subscriptions...');
    
    // Clean up room subscription channel and refresh interval
    if (roomChannelRef.current) {
      const roomChannel = roomChannelRef.current as any;
      if (roomChannel.refreshInterval) {
        clearInterval(roomChannel.refreshInterval);
        console.log('🧹 Cleared room refresh interval');
      }
      roomChannelRef.current.unsubscribe();
      roomChannelRef.current = null;
    }
    
    // Clean up presence channel
    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe();
      presenceChannelRef.current = null;
    }
    
    setState({ room: null, scores: [], participants: [], isHost: false, isConnected: false });
  }, []);

  /** Debug function to manually trigger next round (for testing) */
  const debugForceNextRound = useCallback(async () => {
    if (!state.room || !state.isHost) {
      console.log('❌ Cannot force next round - not host or no room');
      return;
    }
    
    console.log('🔧 FORCE: Manually triggering next round...');
    await nextRound();
  }, [state.room, state.isHost, nextRound]);

  /** Debug function to manually check database state */
  const debugDatabaseState = useCallback(async () => {
    if (!state.room) {
      console.log('❌ No room to debug');
      return;
    }

    console.log('🔍 === DEBUGGING DATABASE STATE ===');
    console.log('🏠 Room ID:', state.room.id);
    console.log('👤 Current User ID:', user.id);
    console.log('🎯 Current Round:', state.room.current_round);

    // Check room state in database
    const { data: roomData, error: roomError } = await sb
      .from('simple_multiplayer_rooms')
      .select('*')
      .eq('id', state.room.id)
      .single();

    console.log('🏠 Room in database:', roomData, 'Error:', roomError);

    // Check all scores for this room
    const { data: allScores, error: scoresError } = await sb
      .from('simple_multiplayer_scores')
      .select('*')
      .eq('room_id', state.room.id)
      .order('created_at', { ascending: true });

    console.log('📊 All scores in database:', allScores, 'Error:', scoresError);
    console.log('📊 Scores count in database:', allScores?.length || 0);
    console.log('📊 Scores count in local state:', state.scores.length);

    // Check current round scores specifically
    const currentRoundScores = allScores?.filter(s => s.round_number === state.room.current_round) || [];
    console.log('🎯 Current round scores in database:', currentRoundScores);

    // Check unique users
    const uniqueUsers = [...new Set(allScores?.map(s => s.user_id) || [])];
    console.log('👥 Unique users who have submitted scores:', uniqueUsers);

    console.log('🔍 === END DATABASE DEBUG ===');

    return {
      roomData,
      allScores,
      currentRoundScores,
      uniqueUsers,
      localScoresCount: state.scores.length,
      databaseScoresCount: allScores?.length || 0
    };
  }, [state.room, state.scores, user.id, sb]);

  return {
    ...state,
    currentUserId: user.id,
    createRoom,
    joinRoom,
    startGame,
    submitGuess,
    nextRound,
    leaveRoom,
    checkAllPlayersReady,
    getLeaderboard,
    getRoundLeaderboard,
    getMultiplayerImages,
    loadPlayerNames,
    debugDatabaseState,
    debugForceNextRound
  };
}; 